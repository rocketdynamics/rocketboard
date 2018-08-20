package sql

import (
	"log"
	"math"
	"testing"
	"time"

	"github.com/arachnys/rocketboard/cmd/rocketboard/model"
)

func newTestRepository() *sqlRepository {
	db, err := NewRepository("sqlite3::memory:")
	db.SetMaxOpenConns(1)
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
		t.Fatal("Failed to create vote", err)
	}
	v, err := db.GetVoteByCardIdAndVoter(vote.CardId, vote.Voter)
	if err != nil {
		t.Fatal("Failed to get vote", err)
	}
	if v.Count != 1 {
		t.Fatal("Bad vote count, expected 1, got:", v.Count)
	}

	for i := 0; i < 100; i++ {
		db.NewVote(vote)
	}

	v, err = db.GetVoteByCardIdAndVoter(vote.CardId, vote.Voter)
	if err != nil {
		t.Fatal("Failed to get vote", err)
	}
	if v.Count != 101 {
		t.Fatal("Bad vote count, expected 101, got:", v.Count)
	}
}

func TestCardSorting(t *testing.T) {
	db := newTestRepository()

	err := db.NewRetrospective(&model.Retrospective{
		Id: "test-retro",
	})

	if err != nil {
		t.Fatal("Failed to create retro", err)
	}

	for i := 0; i < 3; i++ {
		err := db.NewCard(&model.Card{
			Id:              "test-card-" + string(i),
			RetrospectiveId: "test-retro",
			Column:          "Mixed",
		})
		if err != nil {
			t.Fatal("Failed to create card", err)
		}
	}

	for i := 0; i < 50; i++ {
		cards, err := db.GetCardsByRetrospectiveId("test-retro")
		if len(cards) < 3 || err != nil {
			t.Fatal("Failed to get cards for retro", err)
		}
		err = db.MoveCard(cards[0], "Mixed", 1)
		if err != nil {
			t.Fatal("Failed to move card", err)
		}
		newCards, _ := db.GetCardsByRetrospectiveId("test-retro")
		if newCards[1].Id != cards[0].Id {
			t.Fatal("Card didn't move correctly after", i, "swaps")
		}
	}

	cards, _ := db.GetCardsByRetrospectiveId("test-retro")
	cards[0].Position = -2147480000
	err = db.UpdateCard(cards[0])
	if err != nil {
		t.Fatal("Failed to set card position", err)
	}

	for i := 0; i < 1000; i++ {
		cards, err := db.GetCardsByRetrospectiveId("test-retro")
		if len(cards) < 3 || err != nil {
			t.Fatal("Failed to get cards for retro", err)
		}
		err = db.MoveCard(cards[1], "Mixed", 0)
		if err != nil {
			t.Fatal("Failed to move card", err)
		}
		newCards, _ := db.GetCardsByRetrospectiveId("test-retro")
		if newCards[0].Id != cards[1].Id {
			t.Fatal("Card didn't move correctly after", i, "swaps")
		}
	}
	cards, _ = db.GetCardsByRetrospectiveId("test-retro")
	if cards[0].Position < math.MinInt32 {
		t.Error("Card has position outside int32 range:", cards[0].Position)
	}
}
