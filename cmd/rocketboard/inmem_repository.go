package main

import (
	"github.com/pkg/errors"
)

type inmemRepository struct {
	retros map[string]*Retrospective
	cards  map[string]*Card
}

func NewInmemRepository() *inmemRepository {
	return &inmemRepository{}
}

func (db *inmemRepository) NewRetrospective(r Retrospective) error {
	if db.retros == nil {
		db.retros = make(map[string]*Retrospective)
	}

	db.retros[r.Id] = &r
	return nil
}

func (db *inmemRepository) GetRetrospective(retrospectiveId string) (*Retrospective, error) {
	r, ok := db.retros[retrospectiveId]
	if !ok {
		return nil, errors.Errorf("retrospective with ID `{}` does not exist", retrospectiveId)
	}

	return r, nil
}

func (db *inmemRepository) AddCardById(retrospectiveId string, c Card) error {
	r := db.retros[retrospectiveId]
	if r.Cards == nil {
		r.Cards = make(map[string]*Card)
	}
	if db.cards == nil {
		db.cards = make(map[string]*Card)
	}

	card := &c
	r.Cards[c.Id] = card
	db.cards[c.Id] = card

	return nil
}
