//go:generate enumer -type=StatusType

package model

import (
	"fmt"
	"io"
	"strconv"
	"time"
)

type Retrospective struct {
	Id string

	Created time.Time
	Updated time.Time

	Name    string
	PetName string
}

type Card struct {
	Id string

	Created time.Time
	Updated time.Time

	RetrospectiveId string

	Message string
	Creator string
	Column  string

	Position int
}

func (c *Card) String() string {
	return strconv.Itoa(c.Position)
}

func (t *StatusType) UnmarshalGQL(v interface{}) error {
	str, ok := v.(string)
	if !ok {
		return fmt.Errorf("enums must be strings")
	}

	var err error
	*t, err = StatusTypeString(str)
	return err
}

func (t StatusType) MarshalGQL(w io.Writer) {
	fmt.Fprint(w, strconv.Quote(t.String()))
}

func (t *UserStateType) UnmarshalGQL(v interface{}) error {
	str, ok := v.(string)
	if !ok {
		return fmt.Errorf("enums must be strings")
	}

	var err error
	*t, err = UserStateTypeString(str)
	return err
}

func (t UserStateType) MarshalGQL(w io.Writer) {
	fmt.Fprint(w, strconv.Quote(t.String()))
}

type StatusType int

const (
	_ StatusType = iota
	InProgress
	Discussed
	Archived
)

type UserStateType int

const (
	Unknown UserStateType = iota
	Hidden
	Visible
)

type Status struct {
	Id string

	Created time.Time
	CardId  string

	Type StatusType
}

type UserState struct {
	User  string
	State UserStateType
}

type Vote struct {
	Id string

	Created time.Time
	Updated time.Time

	CardId string

	Voter string
	Emoji string
	Count int
}

type Observation struct {
	User            string
	RetrospectiveId string
	ConnectionId    string
	State           UserStateType
	FirstSeen       time.Time
	LastSeen        time.Time
}
