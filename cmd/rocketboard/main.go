package main

import (
	"github.com/99designs/gqlgen/handler"
	"github.com/arachnys/rocketboard/cmd/rocketboard/graph"
	"github.com/arachnys/rocketboard/cmd/rocketboard/repository/inmem"
	"log"
	"net/http"
	"time"
)

func main() {
	svc := NewRocketboardService(inmem.NewRepository())

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

	http.Handle("/query", handler.GraphQL(
		graph.NewExecutableSchema(graph.Config{
			Resolvers: graph.NewResolver(svc),
		}),
	))

	http.HandleFunc("/retrospective/", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "./public/index.html")
	})
	http.Handle("/", http.FileServer(http.Dir("./public/")))

	log.Println("Listening on port 5000 ...")
	log.Fatal(http.ListenAndServe(":5000", nil))
}
