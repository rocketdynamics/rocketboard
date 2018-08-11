package main

import (
	"github.com/99designs/gqlgen/handler"
	"github.com/arachnys/rocketboard/cmd/rocketboard/graph"
	"github.com/arachnys/rocketboard/cmd/rocketboard/repository/inmem"
	"log"
	"net/http"
)

func main() {
	svc := NewRocketboardService(inmem.NewRepository())

	http.Handle("/query-playground", handler.Playground("Rocketboard", "/query"))
	http.Handle("/query", handler.GraphQL(
		graph.NewExecutableSchema(graph.Config{
			Resolvers: graph.NewResolver(svc),
		}),
	))

	http.Handle("/", http.FileServer(http.Dir("./public/")))

	log.Println("Listening on port 5000 ...")
	log.Fatal(http.ListenAndServe(":5000", nil))
}
