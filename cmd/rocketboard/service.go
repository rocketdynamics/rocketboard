package main

import (
	"fmt"
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
	MoveCard(*model.Card, string, int) error
	GetCardById(string) (*model.Card, error)
	GetCardsByRetrospectiveId(string) ([]*model.Card, error)

	NewVote(*model.Vote) error
	GetVotesByCardId(string) ([]*model.Vote, error)
	GetVoteByCardIdAndVoterAndEmoji(string, string, string) (*model.Vote, error)

	NewStatus(*model.Status) error
	GetStatusById(id string) (*model.Status, error)
	GetStatusesByCardId(string) ([]*model.Status, error)

	Healthcheck() error
}

type rocketboardService struct {
	db repository
}

var VALID_EMOJIS = map[string]bool{
	"clap":     true,
	"unicorn":  true,
	"rocket":   true,
	"vomit":    true,
	"+1":       true,
	"tada":     true,
	"sauropod": true,
}

func sanitizeString(str string) string {
	if len(str) > 500 {
		str = str[0:500]
	}
	str = bluemonday.UGCPolicy().Sanitize(str)
	return str
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
		Name:    sanitizeString(name),
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
	votes, err := s.db.GetVotesByCardId(id)
	if err == nil {
		for _, v := range votes {
			if v.Emoji == "" {
				v.Emoji = "clap"
			}
		}
	}
	return votes, err
}

func (s *rocketboardService) GetVoteByCardIdAndVoterAndEmoji(id string, voter string, emoji string) (*model.Vote, error) {
	return s.db.GetVoteByCardIdAndVoterAndEmoji(id, voter, emoji)
}

func (s *rocketboardService) NewVote(cardId string, voter string, emoji string) (*model.Vote, error) {
	if !VALID_EMOJIS[emoji] {
		return nil, fmt.Errorf("Invalid emoji")
	}
	vote, err := s.db.GetVoteByCardIdAndVoterAndEmoji(cardId, voter, emoji)
	if err != nil {
		vote = &model.Vote{
			Id:      newUlid(),
			Created: time.Now(),
			Updated: time.Now(),
			CardId:  cardId,
			Voter:   voter,
			Emoji:   emoji,
			Count:   0,
		}
	}

	vote.Count += 1
	vote.Updated = time.Now()
	err = s.db.NewVote(vote)
	if vote.Emoji == "" {
		vote.Emoji = emoji
	}
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
		Message:         sanitizeString(message),
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

	return s.db.MoveCard(c, column, index)
}

func (s *rocketboardService) UpdateMessage(id string, message string) error {
	c, err := s.db.GetCardById(id)
	if err != nil {
		return err
	}

	c.Message = sanitizeString(message)

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

func (s *rocketboardService) Healthcheck() error {
	return s.db.Healthcheck()
}

func newUlid() string {
	entropy := rand.New(rand.NewSource(time.Now().UnixNano()))
	return ulid.MustNew(ulid.Now(), entropy).String()
}
