package sql

import (
	"log"
	"testing"
	"time"

	"github.com/arachnys/rocketboard/cmd/rocketboard/model"
)

func newTestRepository() *sqlRepository {
	db, err := NewRepository("sqlite3::memory:")
	if err != nil {
		log.Fatal(err)
	}
	return db
}

func TestNewVote(t *testing.T) {
	db := newTestRepository()

	vote := &model.Vote{
		Id:      "id",
		Created: time.Now(),
		Updated: time.Now(),
		CardId:  "id",
		Voter:   "id",
		Count:   1,
	}

	err := db.NewVote(vote)
	if err != nil {
		t.Error("Failed to create vote", err)
	}
	v, err := db.GetVoteByCardIdAndVoter(vote.CardId, vote.Voter)
	if err != nil {
		t.Error("Failed to get vote", err)
	}
	if v.Count != 1 {
		t.Error("Bad vote count, expected 1, got:", v.Count)
	}

	for i := 0; i < 100; i++ {
		db.NewVote(vote)
	}

	v, err = db.GetVoteByCardIdAndVoter(vote.CardId, vote.Voter)
	if err != nil {
		t.Error("Failed to get vote", err)
	}
	if v.Count != 101 {
		t.Error("Bad vote count, expected 101, got:", v.Count)
	}
}
