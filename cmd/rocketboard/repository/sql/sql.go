package sql

import (
	"database/sql"
	"fmt"
	"github.com/jmoiron/sqlx"
	"math"

	"github.com/arachnys/rocketboard/cmd/rocketboard/model"
)

type sqlRepository struct {
	*sqlx.DB
}

var schema = `
CREATE TABLE IF NOT EXISTS retrospectives (
  id TEXT PRIMARY KEY,
  created DATETIME,
  updated DATETIME,
  name TEXT
);
CREATE TABLE IF NOT EXISTS cards (
  id TEXT PRIMARY KEY,
  created DATETIME,
  updated DATETIME,
  retrospectiveId TEXT,
  message TEXT,
  creator TEXT,
  column TEXT,
  idx INTEGER
);
CREATE TABLE IF NOT EXISTS votes (
  id TEXT PRIMARY KEY,
  created DATETIME,
  updated DATETIME,
  cardId TEXT,
  voter TEXT,
  count INTEGER
);
CREATE TABLE IF NOT EXISTS statuses (
  id TEXT PRIMARY KEY,
  created DATETIME,
  cardId  TEXT,
  type INTEGER
);
`

// Space elements by 2^15, which allows for 15 divisions before re-sorting
var IDX_SPACING = int(math.Exp2(15))

func NewRepository(db *sql.DB) *sqlRepository {
	_, err := db.Exec(schema)
	if err != nil {
		panic(err)
	}
	return &sqlRepository{sqlx.NewDb(db, "sqlite3")}
}

func (db *sqlRepository) NewRetrospective(r *model.Retrospective) error {
	_, err := db.NamedExec("INSERT INTO retrospectives (id, created, updated, name) VALUES (:id, :created, :updated, :name)", r)
	return err
}

func (db *sqlRepository) GetRetrospectiveById(id string) (*model.Retrospective, error) {
	var r model.Retrospective
	err := db.Get(&r, "SELECT * FROM retrospectives WHERE id=?", id)
	return &r, err
}

func (db *sqlRepository) NewCard(c *model.Card) error {
	var count int
	var max int
	err := db.Get(&count, `SELECT COUNT(*) FROM cards WHERE retrospectiveId=?`, c.RetrospectiveId)
	if err != nil {
		return err
	}
	err = db.Get(&max, `SELECT max(idx) FROM cards WHERE retrospectiveId=? AND column=?`, c.RetrospectiveId, c.Column)
	if err != nil {
		max = 0
	}

	if count > 100 {
		return fmt.Errorf("too many cards")
	}
	c.Index = max + IDX_SPACING

	_, err = db.NamedExec(`INSERT INTO cards
      (id, created, updated, retrospectiveId, message, creator, column, idx)
    VALUES (:id, :created, :updated, :retrospectiveId, :message, :creator, :column, :idx)
  `, c)
	return err
}

func (db *sqlRepository) UpdateCard(c *model.Card) error {
	if c.Index < 0 {
		return fmt.Errorf("Cannot move to negative index")
	}

	cs := []*model.Card{}
	err := db.Select(&cs, "SELECT * FROM cards WHERE retrospectiveId=? AND column = ? AND id != ? ORDER BY idx ASC", c.RetrospectiveId, c.Column, c.Id)
	if err != nil {
		return err
	}

	if len(cs) == 0 {
		c.Index = IDX_SPACING
	} else if len(cs) <= c.Index {
		c.Index = cs[len(cs)-1].Index + IDX_SPACING
	} else if c.Index == 0 {
		c.Index = cs[0].Index - IDX_SPACING
	} else {
		fmt.Println("moving to", c.Index, cs[c.Index], cs[c.Index-1])
		c.Index = (cs[c.Index].Index + cs[c.Index-1].Index) / 2
	}

	_, err = db.NamedExec(`UPDATE cards
    SET updated=:updated, retrospectiveId=:retrospectiveId, message=:message, creator=:creator, column=:column, idx=:idx
    WHERE id=:id
  `, c)
	return err
}

func (db *sqlRepository) GetCardById(id string) (*model.Card, error) {
	var c model.Card
	err := db.Get(&c, "SELECT * FROM cards WHERE id=?", id)
	return &c, err
}

func (db *sqlRepository) GetCardsByRetrospectiveId(id string) ([]*model.Card, error) {
	cs := []*model.Card{}
	err := db.Select(&cs, "SELECT * FROM cards WHERE retrospectiveId=? ORDER BY idx ASC", id)
	return cs, err
}

func (db *sqlRepository) NewVote(v *model.Vote) error {
	_, err := db.NamedExec(`INSERT INTO votes
      (id, created, updated, cardId, voter, count)
    VALUES (:id, :created, :updated, :cardId, :voter, :count)
    ON CONFLICT(id) DO UPDATE SET updated=:updated, count=:count
  `, v)
	return err
}

func (db *sqlRepository) GetVotesByCardId(id string) ([]*model.Vote, error) {
	vs := []*model.Vote{}
	err := db.Select(&vs, "SELECT * FROM votes WHERE cardId=?", id)
	return vs, err
}

func (db *sqlRepository) NewStatus(s *model.Status) error {
	_, err := db.NamedExec(`INSERT INTO statuses
      (id, created, cardId, type)
    VALUES (:id, :created, :cardId, :type)
  `, s)
	return err
}

func (db *sqlRepository) GetStatusById(id string) (*model.Status, error) {
	var s model.Status
	err := db.Get(&s, "SELECT * FROM statuses WHERE id=?", id)
	return &s, err
}

func (db *sqlRepository) GetStatusesByCardId(id string) ([]*model.Status, error) {
	ss := []*model.Status{}
	err := db.Select(&ss, "SELECT * FROM statuses WHERE cardId=?", id)
	return ss, err
}
