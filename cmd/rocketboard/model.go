package main

import (
	"time"
)

type Retrospective struct {
	Id      string
	Created time.Time

	Name string

	Cards map[string]*Card
}

type Status int

const (
	_ Status = iota
	InProgress
	Discussed
	Closed
)

type Card struct {
	Id      string
	Created time.Time

	Message string
	Creator string
	Column  string

	Status Status
	Votes  map[string]int
}
