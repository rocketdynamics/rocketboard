package main

import (
	"github.com/oklog/ulid"
	"math/rand"
	"time"
)

type repository interface {
	NewRetrospective(Retrospective) error
	GetRetrospective(string) (*Retrospective, error)
	AddCardById(string, Card) error
}

type rocketboardService struct {
	db repository
}

func NewRocketboardService(r repository) *rocketboardService {
	return &rocketboardService{r}
}

func (s *rocketboardService) NewRetrospective(name string) (string, error) {
	id := newUlid()

	r := Retrospective{
		Id:      id,
		Created: time.Now(),
		Name:    name,
	}
	if err := s.db.NewRetrospective(r); err != nil {
		return "", err
	}

	return id, nil
}

func (s *rocketboardService) GetRetrospective(id string) (*Retrospective, error) {
	return s.db.GetRetrospective(id)
}

func (s *rocketboardService) AddCardToRetrospective(retrospectiveId string, message string, creator string, column string) (string, error) {
	if _, err := s.GetRetrospective(retrospectiveId); err != nil {
		return "", err
	}

	id := newUlid()

	// TODO: check if retrospective exists
	// GetRetrospective

	c := Card{
		Id:      id,
		Created: time.Now(),
		Message: message,
		Creator: creator,
		Column:  column,
	}
	if err := s.db.AddCardById(retrospectiveId, c); err != nil {
		return "", err
	}

	return id, nil
}

func newUlid() string {
	t := time.Unix(1000000, 0)
	entropy := rand.New(rand.NewSource(t.UnixNano()))
	return ulid.MustNew(ulid.Timestamp(t), entropy).String()
}
