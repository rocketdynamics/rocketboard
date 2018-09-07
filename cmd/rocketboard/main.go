package main

import (
	"context"
	"encoding/base64"
	"github.com/99designs/gqlgen/handler"
	"github.com/arachnys/rocketboard/cmd/rocketboard/graph"
	rocketSql "github.com/arachnys/rocketboard/cmd/rocketboard/repository/sql"
	"github.com/arachnys/rocketboard/cmd/rocketboard/utils"
	"log"
	"net/http"
	"os"
	"regexp"
	"strings"
)

func WithEmail(base http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		email := "unknown"

		cookie, err := r.Cookie("_oauth2_proxy")
		if err == nil {
			parts := strings.Split(cookie.Value, "|")
			if len(parts) > 0 {
				cookieValue, err := base64.StdEncoding.DecodeString(parts[0])
				if err == nil {
					re := regexp.MustCompile("email:([^\\s]+)")
					matches := re.FindStringSubmatch(string(cookieValue))
					if len(matches) > 1 {
						email = matches[1]
					}
				}
			}
		}
		if os.Getenv("DEBUG") == "1" && r.FormValue("email") != "" {
			email = r.FormValue("email")
		}
		ctx = context.WithValue(ctx, "email", email)
		ctx = context.WithValue(ctx, "connectionId", utils.NewUlid())
		r = r.WithContext(ctx)
		base.ServeHTTP(w, r)
	})
}

func main() {
	dbURI := os.Getenv("ROCKET_DATABASE_URI")
	if dbURI == "" {
		dbURI = "sqlite3:rocket.db"
	}
	repository, err := rocketSql.NewRepository(dbURI)
	if err != nil {
		log.Fatal(err)
	}
	svc := NewRocketboardService(repository)
	obs := NewObservationStore(repository)
	graph.InitMessageQueue()

	http.Handle("/query-playground", handler.Playground("Rocketboard", "/query"))
	http.HandleFunc("/healthcheck", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		svc.Healthcheck()
		w.Write([]byte("OK"))
	})

	http.Handle("/query", WithEmail(handler.GraphQL(
		graph.NewExecutableSchema(graph.Config{
			Resolvers: graph.NewResolver(svc, obs),
		}),
	)))

	http.HandleFunc("/retrospective/", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "./public/index.html")
	})
	http.Handle("/", http.FileServer(http.Dir("./public/")))

	log.Println("Listening on port 5000 ...")
	log.Fatal(http.ListenAndServe(":5000", nil))
}
