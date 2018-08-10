package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/gorilla/handlers"
	"github.com/gorilla/mux"
)

func main() {

	r := mux.NewRouter()
	r.PathPrefix("/").Handler(http.FileServer(http.Dir("./public/")))

	loggedRouter := handlers.LoggingHandler(os.Stdout, r)
	fmt.Println("Listening on port 5000")
	log.Fatal(http.ListenAndServe(":5000", loggedRouter))
}
