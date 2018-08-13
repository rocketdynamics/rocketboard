package main

import (
	"github.com/arachnys/rocketboard/cmd/rocketboard/model"
	"github.com/microcosm-cc/bluemonday"
	"github.com/oklog/ulid"
	"math/rand"
	"time"
)

type repository interface {
	NewRetrospective(*model.Retrospective) error
	GetRetrospectiveById(string) (*model.Retrospective, error)

	NewCard(*model.Card) error
	UpdateCard(*model.Card) error
	GetCardById(string) (*model.Card, error)
	GetCardsByRetrospectiveId(string) ([]*model.Card, error)

	NewVote(v *model.Vote) error
	GetVotesByCardId(id string) ([]*model.Vote, error)
}

type rocketboardService struct {
	db repository
}

func NewRocketboardService(r repository) *rocketboardService {
	return &rocketboardService{r}
}

func (s *rocketboardService) StartRetrospective(name string) (string, error) {
	id := newUlid()

	r := &model.Retrospective{
		Id:      id,
		Created: time.Now(),
		Updated: time.Now(),
		Name:    name,
	}
	if err := s.db.NewRetrospective(r); err != nil {
		return "", err
	}

	return id, nil
}

func (s *rocketboardService) GetRetrospectiveById(id string) (*model.Retrospective, error) {
	return s.db.GetRetrospectiveById(id)
}

func (s *rocketboardService) GetVotesByCardId(id string) ([]*model.Vote, error) {
	return s.db.GetVotesByCardId(id)
}

func (s *rocketboardService) NewVote(cardId string, voter string) (*model.Vote, error) {
	votes, err := s.GetVotesByCardId(cardId)
	if err != nil {
		return nil, err
	}

	vote := &model.Vote{
		Id:      newUlid(),
		Created: time.Now(),
		Updated: time.Now(),
		CardId:  cardId,
		Voter:   voter,
		Count:   1,
	}

	for _, existingVote := range votes {
		if voter == existingVote.Voter {
			vote = existingVote
			vote.Count = vote.Count + 1
			break
		}
	}

	err = s.db.NewVote(vote)
	return vote, err
}

func (s *rocketboardService) AddCardToRetrospective(rId string, column string, message string, creator string) (string, error) {
	if _, err := s.GetRetrospectiveById(rId); err != nil {
		return "", err
	}

	id := newUlid()

	if err := s.db.NewCard(&model.Card{
		Id:              id,
		Created:         time.Now(),
		Updated:         time.Now(),
		RetrospectiveId: rId,
		Message:         bluemonday.UGCPolicy().Sanitize(message),
		Creator:         creator,
		Column:          column,
	}); err != nil {
		return "", err
	}

	return id, nil
}

func (s *rocketboardService) MoveCard(id string, column string) error {
	c, err := s.db.GetCardById(id)
	if err != nil {
		return err
	}

	c.Column = column

	return s.db.UpdateCard(c)
}

func (s *rocketboardService) UpdateMessage(id string, message string) error {
	c, err := s.db.GetCardById(id)
	if err != nil {
		return err
	}

	c.Message = bluemonday.UGCPolicy().Sanitize(message)

	return s.db.UpdateCard(c)
}

func (s *rocketboardService) GetCardById(id string) (*model.Card, error) {
	return s.db.GetCardById(id)
}

func (s *rocketboardService) GetCardsForRetrospective(rId string) ([]*model.Card, error) {
	return s.db.GetCardsByRetrospectiveId(rId)
}

func newUlid() string {
	entropy := rand.New(rand.NewSource(time.Now().UnixNano()))
	return ulid.MustNew(ulid.Now(), entropy).String()
}
