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

	NewVote(*model.Vote) error
	GetVotesByCardId(string) ([]*model.Vote, error)
	GetVoteByCardIdAndVoter(string, string) (*model.Vote, error)

	NewStatus(*model.Status) error
	GetStatusById(id string) (*model.Status, error)
	GetStatusesByCardId(string) ([]*model.Status, error)
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

func (s *rocketboardService) GetVoteByCardIdAndVoter(id string, voter string) (*model.Vote, error) {
	return s.db.GetVoteByCardIdAndVoter(id, voter)
}

func (s *rocketboardService) NewVote(cardId string, voter string) (*model.Vote, error) {
	vote, err := s.db.GetVoteByCardIdAndVoter(cardId, voter)
	if err != nil {
		vote = &model.Vote{
			Id:      newUlid(),
			Created: time.Now(),
			Updated: time.Now(),
			CardId:  cardId,
			Voter:   voter,
			Count:   0,
		}
	}

	vote.Count = vote.Count + 1
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

func (s *rocketboardService) MoveCard(id string, column string, index int) error {
	c, err := s.db.GetCardById(id)
	if err != nil {
		return err
	}

	c.Column = column
	c.Index = index

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

func (s *rocketboardService) GetCardStatuses(id string) ([]*model.Status, error) {
	return s.db.GetStatusesByCardId(id)
}

func (s *rocketboardService) GetStatusById(id string) (*model.Status, error) {
	return s.db.GetStatusById(id)
}

func (s *rocketboardService) SetStatus(id string, t model.StatusType) (string, error) {
	c, err := s.db.GetCardById(id)
	if err != nil {
		return "", err
	}

	statusId := newUlid()
	status := &model.Status{
		Id:      statusId,
		Created: time.Now(),
		CardId:  c.Id,
		Type:    t,
	}

	if err := s.db.NewStatus(status); err != nil {
		return "", err
	}

	return statusId, nil
}

func (s *rocketboardService) NewUlid() string {
	return newUlid()
}

func newUlid() string {
	entropy := rand.New(rand.NewSource(time.Now().UnixNano()))
	return ulid.MustNew(ulid.Now(), entropy).String()
}
