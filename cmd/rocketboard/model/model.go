package model

import (
	"time"
)

type Retrospective struct {
	Id string

	Created time.Time
	Updated time.Time

	Name string
}

type Status int

const (
	_ Status = iota
	InProgress
	Discussed
	Archived
)

type Card struct {
	Id string

	Created time.Time
	Updated time.Time

	RetrospectiveId string

	Message string
	Creator string
	Column  string

	Status Status
}

type Vote struct {
	Id string

	Created time.Time
	Updated time.Time

	CardId string

	Voter string
	Count int
}
