package main

import (
	"context"
	"encoding/base64"
	"log"
	"net/http"
	"os"
	"regexp"
	"strings"

	"github.com/99designs/gqlgen/handler"
	"github.com/gorilla/websocket"
	"github.com/rocketdynamics/rocketboard/cmd/rocketboard/graph"
	rocketFirestore "github.com/rocketdynamics/rocketboard/cmd/rocketboard/repository/firestore"
	// rocketSql "github.com/rocketdynamics/rocketboard/cmd/rocketboard/repository/sql"
	"github.com/rocketdynamics/rocketboard/cmd/rocketboard/utils"
)

func WithCors(base http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		(w).Header().Set("Access-Control-Allow-Origin", "*")
		base.ServeHTTP(w, r)
	})
}

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
		log.Println("No ROCKET_DATABASE_URI specified, using sqlite3:rocket.db")
		dbURI = "sqlite3:rocket.db"
	}

	// repository, err := rocketSql.NewRepository(dbURI)
	// if err != nil {
	// 	log.Fatal(err)
	// }
	repository2, err := rocketFirestore.NewRepository()
	if err != nil {
		log.Fatal(err)
	}
	svc := NewRocketboardService(repository2)
	// graph.InitNatsMessageQueue()
	graph.InitGcloudMessageQueue()

	http.Handle("/query-playground", handler.Playground("Rocketboard", "/query"))
	http.HandleFunc("/healthcheck", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		svc.Healthcheck()
		w.Write([]byte("OK"))
	})

	gqlHandler := handler.GraphQL(
		graph.NewExecutableSchema(graph.Config{
			Resolvers: graph.NewResolver(svc, repository2),
		}),
		handler.WebsocketUpgrader(websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool {
				return true
			},
			ReadBufferSize:  1024,
			WriteBufferSize: 1024,
		}),
	)

	http.Handle("/query", WithCors(WithEmail(gqlHandler)))

	http.HandleFunc("/retrospective/", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "./public/index.html")
	})
	http.Handle("/", http.FileServer(http.Dir("./public/")))

	log.Println("Listening on port 5000 ...")
	log.Fatal(http.ListenAndServe(":5000", nil))
}
