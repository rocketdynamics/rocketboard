package sql

import (
	"database/sql"
	"fmt"
	"github.com/jmoiron/sqlx"

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
  column TEXT
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
	err := db.Get(&count, `SELECT COUNT(*) FROM cards WHERE retrospectiveId=?`, c.RetrospectiveId)
	if err != nil {
		return err
	}

	if count > 100 {
		return fmt.Errorf("too many cards")
	}

	_, err = db.NamedExec(`INSERT INTO cards
      (id, created, updated, retrospectiveId, message, creator, column)
    VALUES (:id, :created, :updated, :retrospectiveId, :message, :creator, :column)
  `, c)
	return err
}

func (db *sqlRepository) UpdateCard(c *model.Card) error {
	_, err := db.NamedExec(`UPDATE cards
    SET updated=:updated, retrospectiveId=:retrospectiveId, message=:message, creator=:creator, column=:column
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
	err := db.Select(&cs, "SELECT * FROM cards WHERE retrospectiveId=?", id)
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
