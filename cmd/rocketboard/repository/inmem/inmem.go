package inmem

import (
	"github.com/arachnys/rocketboard/cmd/rocketboard/model"
	"github.com/pkg/errors"
)

type inmemRepository struct {
	retrosById             map[string]*model.Retrospective
	cardsById              map[string]*model.Card
	cardsByRetrospectiveId map[string][]*model.Card

	votesById     map[string]*model.Vote
	votesByCardId map[string][]*model.Vote

	statusesById     map[string]*model.Status
	statusesByCardId map[string][]*model.Status
}

func NewRepository() *inmemRepository {
	return &inmemRepository{}
}

func (db *inmemRepository) NewRetrospective(r *model.Retrospective) error {
	if db.retrosById == nil {
		db.retrosById = make(map[string]*model.Retrospective)
	}

	db.retrosById[r.Id] = r
	return nil
}

func (db *inmemRepository) GetRetrospectiveById(id string) (*model.Retrospective, error) {
	r, ok := db.retrosById[id]
	if !ok {
		return nil, errors.Errorf("retrospective with ID `%s` does not exist", id)
	}

	return r, nil
}

func (db *inmemRepository) NewCard(c *model.Card) error {
	if db.cardsById == nil {
		db.cardsById = make(map[string]*model.Card)
	}
	if db.cardsByRetrospectiveId == nil {
		db.cardsByRetrospectiveId = make(map[string][]*model.Card)
	}

	db.cardsById[c.Id] = c
	db.cardsByRetrospectiveId[c.RetrospectiveId] = append(db.cardsByRetrospectiveId[c.RetrospectiveId], c)

	return nil
}

func (db *inmemRepository) UpdateCard(card *model.Card) error {
	c := db.cardsById[card.Id]
	c.Column = card.Column
	c.Message = card.Message
	return nil
}

func (db *inmemRepository) GetCardById(id string) (*model.Card, error) {
	c, ok := db.cardsById[id]
	if !ok {
		return nil, errors.Errorf("card with ID `%s` does not exist", id)
	}

	return c, nil
}

func (db *inmemRepository) GetCardsByRetrospectiveId(id string) ([]*model.Card, error) {
	cards, ok := db.cardsByRetrospectiveId[id]
	if !ok {
		return nil, errors.Errorf("card(s) with retrospective ID `%s` does not exist", id)
	}

	return cards, nil
}

func (db *inmemRepository) NewVote(v *model.Vote) error {
	if db.votesById == nil {
		db.votesById = make(map[string]*model.Vote)
	}
	if db.votesByCardId == nil {
		db.votesByCardId = make(map[string][]*model.Vote)
	}

	// Update existing vote instead of adding new if we already have it.
	if db.votesById[v.Id] == nil {
		db.votesByCardId[v.CardId] = append(db.votesByCardId[v.CardId], v)
		db.votesById[v.Id] = v
	} else {
		db.votesById[v.Id].Count = v.Count
	}

	return nil
}

func (db *inmemRepository) GetVotesByCardId(id string) ([]*model.Vote, error) {
	votes, ok := db.votesByCardId[id]
	if !ok {
		return make([]*model.Vote, 0), nil
	}

	return votes, nil
}

func (db *inmemRepository) NewStatus(s *model.Status) error {
	if db.statusesById == nil {
		db.statusesById = make(map[string]*model.Status)
	}
	if db.statusesByCardId == nil {
		db.statusesByCardId = make(map[string][]*model.Status)
	}

	db.statusesById[s.Id] = s
	db.statusesByCardId[s.CardId] = append(db.statusesByCardId[s.CardId], s)

	return nil
}

func (db *inmemRepository) GetStatusById(id string) (*model.Status, error) {
	s, ok := db.statusesById[id]
	if !ok {
		return nil, errors.Errorf("status with ID `%s` does not exist", id)
	}

	return s, nil
}

func (db *inmemRepository) GetStatusesByCardId(id string) ([]*model.Status, error) {
	statuses, ok := db.statusesByCardId[id]
	if !ok {
		return make([]*model.Status, 0), nil
	}

	return statuses, nil
}
