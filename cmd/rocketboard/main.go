package main

import (
	"context"
	"database/sql"
	"encoding/base64"
	"github.com/99designs/gqlgen/handler"
	"github.com/arachnys/rocketboard/cmd/rocketboard/graph"
	rocketSql "github.com/arachnys/rocketboard/cmd/rocketboard/repository/sql"
	_ "github.com/mattn/go-sqlite3"
	// "github.com/arachnys/rocketboard/pkg/dqlite"
	"log"
	"net/http"
	"os"
	"path"
	"regexp"
	"strings"
	"time"
)

func WithEmail(base http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		email := "unknown"

		cookie, err := r.Cookie("_oauth2_proxy")
		if err == nil {
			parts := strings.Split(cookie.Value, ":")
			if len(parts) > 0 {
				cookieValue, err := base64.StdEncoding.DecodeString(parts[0])
				if err != nil {
					re := regexp.MustCompile("email:([^\\s]+)")
					matches := re.FindStringSubmatch(string(cookieValue))
					if len(matches) > 1 {
						email = matches[1]
					}
				}
			}
		}
		ctx = context.WithValue(ctx, "email", email)
		r = r.WithContext(ctx)
		base.ServeHTTP(w, r)
	})
}

func main() {
	dbPath := os.Getenv("ROCKET_DATA_DIR")
	db, err := sql.Open("sqlite3", path.Join(dbPath, "rocket.db"))
	if err != nil {
		log.Fatal(err)
	}
	svc := NewRocketboardService(rocketSql.NewRepository(db))

	http.Handle("/query-playground", handler.Playground("Rocketboard", "/query"))
	http.HandleFunc("/retrospective/new", func(w http.ResponseWriter, r *http.Request) {
		name := "Retrospective " + time.Now().Format("2006-01-02")
		id, err := svc.StartRetrospective(name)
		if err != nil {
			w.WriteHeader(http.StatusBadRequest)
			return
		}

		http.Redirect(w, r, "/retrospective/"+id, http.StatusFound)
	})

	http.Handle("/query", WithEmail(handler.GraphQL(
		graph.NewExecutableSchema(graph.Config{
			Resolvers: graph.NewResolver(svc),
		}),
	)))

	http.HandleFunc("/retrospective/", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "./public/index.html")
	})
	http.Handle("/", http.FileServer(http.Dir("./public/")))

	log.Println("Listening on port 5000 ...")
	log.Fatal(http.ListenAndServe(":5000", nil))
}
