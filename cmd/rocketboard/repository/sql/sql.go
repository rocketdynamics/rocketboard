package sql

import (
	"fmt"
	"github.com/jmoiron/sqlx"
	"log"
	"math"
	"net/url"

	_ "github.com/lib/pq"
	_ "github.com/mattn/go-sqlite3"

	"github.com/arachnys/rocketboard/cmd/rocketboard/model"
)

type sqlRepository struct {
	*sqlx.DB
}

var schema = `
CREATE TABLE IF NOT EXISTS retrospectives (
  id TEXT PRIMARY KEY,
  created TIMESTAMP,
  updated TIMESTAMP,
  name TEXT
);
CREATE TABLE IF NOT EXISTS cards (
  id TEXT PRIMARY KEY,
  created TIMESTAMP,
  updated TIMESTAMP,
  retrospectiveid TEXT,
  message TEXT,
  creator TEXT,
  "column" TEXT,
  position INTEGER
);
CREATE TABLE IF NOT EXISTS votes (
  id TEXT PRIMARY KEY,
  created TIMESTAMP,
  updated TIMESTAMP,
  cardid TEXT,
  voter TEXT,
  count INTEGER
);
CREATE TABLE IF NOT EXISTS statuses (
  id TEXT PRIMARY KEY,
  created TIMESTAMP,
  cardid  TEXT,
  type INTEGER
);
CREATE TABLE IF NOT EXISTS observations (
  "user" TEXT,
  retrospectiveid TEXT,
  connectionid TEXT,
  state INTEGER,
  firstseen TIMESTAMP,
  lastseen TIMESTAMP
);
CREATE INDEX IF NOT EXISTS obs_retro ON observations(retrospectiveid);
CREATE UNIQUE INDEX IF NOT EXISTS obs_connectionid ON observations(connectionid);
CREATE INDEX IF NOT EXISTS obs_firstseen ON observations(firstseen);
CREATE INDEX IF NOT EXISTS obs_lastseen ON observations(lastseen);
`

var migrations = []string{`
  ALTER TABLE votes ADD
    emoji TEXT DEFAULT('clap');
  `, `
  ALTER TABLE retrospectives ADD
    petname TEXT;
  UPDATE retrospectives SET petname = id WHERE petname IS NULL;
  CREATE UNIQUE INDEX IF NOT EXISTS retro_petname on retrospectives(petname);
  `, `
  CREATE INDEX IF NOT EXISTS cards_retro on cards(retrospectiveid);
`}

// Space elements by 2^15, which allows for 15 divisions before re-sorting
var IDX_SPACING = int(math.Exp2(15))

func NewRepository(dbURI string) (*sqlRepository, error) {
	url, err := url.Parse(dbURI)
	if err != nil {
		return nil, err
	}
	dbDriver := url.Scheme
	if dbDriver == "sqlite3" {
		url.Scheme = ""
	}

	var db *sqlx.DB
	for tries := 50; tries > 0; tries -= 1 {
		db, err = sqlx.Open(dbDriver, url.String())
		if err == nil {
			break
		}
	}
	if err != nil {
		return nil, err
	}

	_, err = db.Exec(schema)
	if err != nil {
		return nil, err
	}

	for _, migration := range migrations {
		_, err = db.Exec(migration)
		if err != nil {
			log.Println(err)
		}
	}
	return &sqlRepository{db}, nil
}

func (db *sqlRepository) NewRetrospective(r *model.Retrospective) error {
	_, err := db.NamedExec("INSERT INTO retrospectives (id, created, updated, name, petname) VALUES (:id, :created, :updated, :name, :petname)", r)
	return err
}

func (db *sqlRepository) GetRetrospectiveById(id string) (*model.Retrospective, error) {
	var r model.Retrospective
	err := db.Get(&r, "SELECT * FROM retrospectives WHERE id=$1", id)
	return &r, err
}

func (db *sqlRepository) GetRetrospectiveByPetName(petName string) (*model.Retrospective, error) {
	var r model.Retrospective
	err := db.Get(&r, "SELECT * FROM retrospectives WHERE petname=$1", petName)
	return &r, err
}

func (db *sqlRepository) NewCard(c *model.Card) error {
	var count int
	var min int
	err := db.Get(&count, `SELECT COUNT(*) FROM cards WHERE retrospectiveid=$1`, c.RetrospectiveId)
	if err != nil {
		return err
	}
	err = db.Get(&min, `SELECT min(position) FROM cards WHERE retrospectiveid=$1 AND "column"=$2`, c.RetrospectiveId, c.Column)
	if err != nil {
		min = 0
	}

	if count > 100 {
		return fmt.Errorf("too many cards")
	}
	c.Position = min - IDX_SPACING

	_, err = db.NamedExec(`INSERT INTO cards
      (id, created, updated, retrospectiveid, message, creator, "column", position)
    VALUES (:id, :created, :updated, :retrospectiveid, :message, :creator, :column, :position)
  `, c)
	return err
}

func (db *sqlRepository) reorderColumn(rId string, column string) {
	tx := db.MustBegin()
	defer tx.Rollback()
	cs := []*model.Card{}
	err := tx.Select(&cs, `SELECT * FROM cards WHERE retrospectiveid=$1 AND "column"=$2 ORDER BY position ASC`, rId, column)
	if err != nil {
		log.Println("ERROR: Error reordering", err)
	}

	for i, c := range cs {
		c.Position = IDX_SPACING * (i + 1)

		_, err := tx.NamedExec(`UPDATE cards
      SET updated=:updated, retrospectiveid=:retrospectiveid, message=:message, creator=:creator, "column"=:column, position=:position
      WHERE id=:id
    `, c)

		if err != nil {
			log.Println("ERROR: Failed to reorder card indexes", err)
		}
	}
	err = tx.Commit()
	if err != nil {
		log.Println("ERROR: Error reordering", err)
	}
}

func (db *sqlRepository) MoveCard(c *model.Card, column string, index int) error {
	cs := []*model.Card{}
	tx := db.MustBegin()
	defer tx.Rollback()
	err := tx.Select(&cs, `SELECT * FROM cards WHERE retrospectiveid=$1 AND "column"=$2 AND id!=$3 ORDER BY position ASC LIMIT $4`, c.RetrospectiveId, column, c.Id, index+1)
	if err != nil {
		return err
	}

	if index < 0 {
		return fmt.Errorf("Cannot move to negative index")
	}

	if len(cs) == 0 {
		c.Position = IDX_SPACING
	} else if index >= len(cs) {
		c.Position = cs[len(cs)-1].Position + IDX_SPACING
	} else if index == 0 {
		c.Position = cs[0].Position - IDX_SPACING
	} else {
		c.Position = (cs[index].Position + cs[index-1].Position) / 2
	}

	c.Column = column

	tx.NamedExec(`UPDATE cards
    SET updated=:updated, retrospectiveid=:retrospectiveid, message=:message, creator=:creator, "column"=:column, position=:position
    WHERE id=:id
  `, c)

	if index > 0 && len(cs) >= index && c.Position-cs[index-1].Position < 4 || c.Position < -int(math.Exp2(30)) || c.Position > int(math.Exp2(30)) {
		go db.reorderColumn(c.RetrospectiveId, column)
	}

	err = tx.Commit()

	return err
}

func (db *sqlRepository) UpdateCard(c *model.Card) error {
	_, err := db.NamedExec(`UPDATE cards
    SET updated=:updated, retrospectiveid=:retrospectiveid, message=:message, creator=:creator, "column"=:column, position=:position
    WHERE id=:id
  `, c)
	return err
}

func (db *sqlRepository) GetCardById(id string) (*model.Card, error) {
	var c model.Card
	err := db.Get(&c, "SELECT * FROM cards WHERE id=$1", id)
	return &c, err
}

func (db *sqlRepository) GetCardsByRetrospectiveId(id string) ([]*model.Card, error) {
	cs := []*model.Card{}
	err := db.Select(&cs, "SELECT * FROM cards WHERE retrospectiveid=$1 ORDER BY position ASC", id)
	return cs, err
}

func (db *sqlRepository) NewVote(v *model.Vote) error {
	_, err := db.NamedExec(`INSERT INTO votes
      (id, created, updated, cardid, voter, emoji, count)
    VALUES (:id, :created, :updated, :cardid, :voter, :emoji, :count)
    ON CONFLICT(id) DO UPDATE SET updated=:updated, count=votes.count + 1
  `, v)
	return err
}

func (db *sqlRepository) GetVotesByCardId(id string) ([]*model.Vote, error) {
	vs := []*model.Vote{}
	err := db.Select(&vs, "SELECT * FROM votes WHERE cardid=$1", id)
	return vs, err
}

func (db *sqlRepository) GetVoteByCardIdAndVoterAndEmoji(id string, voter string, emoji string) (*model.Vote, error) {
	v := model.Vote{}
	err := db.Get(&v, "SELECT * FROM votes WHERE cardid=$1 AND voter=$2 AND emoji=$3", id, voter, emoji)
	return &v, err
}

func (db *sqlRepository) GetTotalUniqueEmojis(id string) (int, error) {
	var count int
	err := db.Get(&count, "SELECT COUNT(distinct emoji) FROM votes WHERE cardid=$1", id)
	return count, err
}

func (db *sqlRepository) NewStatus(s *model.Status) error {
	_, err := db.NamedExec(`INSERT INTO statuses
      (id, created, cardid, type)
    VALUES (:id, :created, :cardid, :type)
  `, s)
	return err
}

func (db *sqlRepository) GetStatusById(id string) (*model.Status, error) {
	var s model.Status
	err := db.Get(&s, "SELECT * FROM statuses WHERE id=$1", id)
	return &s, err
}

func (db *sqlRepository) GetStatusesByCardId(id string) ([]*model.Status, error) {
	ss := []*model.Status{}
	err := db.Select(&ss, "SELECT * FROM statuses WHERE cardid=$1", id)
	return ss, err
}

func (db *sqlRepository) Healthcheck() error {
	_, err := db.Exec(`SELECT COUNT(*) FROM repositories`)
	return err
}
