package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/gorilla/handlers"
	"github.com/gorilla/mux"
)

type handler struct {
	service *rocketboardService
}

func main() {

	r := mux.NewRouter()

	db := NewInmemRepository()
	h := handler{
		service: NewRocketboardService(db),
	}

	r.HandleFunc("/retrospective/{id}/", h.RetrospectiveGetHandler).Methods("GET")
	r.HandleFunc("/retrospective/", h.RetrospectivePostHandler).Methods("POST")
	r.HandleFunc("/retrospective/{id}/card/", h.CardPostHandler).Methods("POST")

	r.PathPrefix("/").Handler(http.FileServer(http.Dir("./public/")))

	allowedHeaders := handlers.AllowedHeaders([]string{"Accept", "Authorization", "Content-Type", "Content-Length", "Accept-Encoding"})
	allowedOrigins := handlers.AllowedOrigins([]string{"*"})
	allowedMethods := handlers.AllowedMethods([]string{"GET", "HEAD", "POST", "PUT", "DELETE", "OPTIONS"})

	corsRouter := handlers.CORS(allowedHeaders, allowedOrigins, allowedMethods)(r)
	loggedRouter := handlers.LoggingHandler(os.Stdout, corsRouter)

	fmt.Println("Listening on port 5000")
	log.Fatal(http.ListenAndServe(":5000", loggedRouter))
}

func (h *handler) RetrospectiveGetHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	retrospective, err := h.service.GetRetrospective(vars["id"])
	if err != nil {
		w.WriteHeader(http.StatusNotFound)
		return
	}

	jsonData, err := json.Marshal(retrospective)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
	}

	w.WriteHeader(http.StatusOK)
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(jsonData))
}

func (h *handler) RetrospectivePostHandler(w http.ResponseWriter, r *http.Request) {
	name := r.FormValue("name")

	id, err := h.service.NewRetrospective(name)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	data := map[string]string{"id": id}
	jsonData, err := json.Marshal(data)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
	}

	w.WriteHeader(http.StatusOK)
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(jsonData))
}

func (h *handler) CardPostHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)

	message := r.FormValue("message")
	// Replace with oauth proxy header value
	creator := "anonymous"
	column := r.FormValue("column")

	id, err := h.service.AddCardToRetrospective(vars["id"], message, creator, column)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	data := map[string]string{"id": id}
	jsonData, err := json.Marshal(data)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
	}

	w.WriteHeader(http.StatusOK)
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(jsonData))
}
