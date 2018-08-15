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

type Card struct {
	Id string

	Created time.Time
	Updated time.Time

	RetrospectiveId string

	Message string
	Creator string
	Column  string
}

type StatusType int

const (
	_ StatusType = iota
	InProgress
	Discussed
	Archived
)

type Status struct {
	Id string

	Created time.Time
	CardId  string

	Type StatusType
}

type Vote struct {
	Id string

	Created time.Time
	Updated time.Time

	CardId string

	Voter string
	Count int
}
