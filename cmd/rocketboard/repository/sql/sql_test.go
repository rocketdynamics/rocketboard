package sql

import (
	"log"
	"math/rand"
	"testing"
	"time"

	"github.com/arachnys/rocketboard/cmd/rocketboard/model"
)

func init() {
	rand.Seed(1337)
}

func newTestRepository() *sqlRepository {
	db, err := NewRepository("sqlite3::memory:")
	db.SetMaxOpenConns(1)
	if err != nil {
		log.Fatal(err)
	}

	err = db.NewRetrospective(&model.Retrospective{
		Id: "test-retro",
	})

	if err != nil {
		log.Fatal("Failed to create retro", err)
	}

	for i := 0; i < 100; i++ {
		err := db.NewCard(&model.Card{
			Id:              "test-card-" + string(i),
			RetrospectiveId: "test-retro",
			Column:          "Mixed",
		})
		if err != nil {
			log.Fatal("Failed to create card", err)
		}
	}
	return db
}

func TestNewVote(t *testing.T) {
	db := newTestRepository()

	vote := &model.Vote{
		Id:      "test-vote",
		Created: time.Now(),
		Updated: time.Now(),
		CardId:  "test-card-0",
		Voter:   "voter",
		Emoji:   "clap",
		Count:   1,
	}

	err := db.NewVote(vote)
	if err != nil {
		t.Fatal("Failed to create vote", err)
	}
	v, err := db.GetVoteByCardIdAndVoterAndEmoji(vote.CardId, vote.Voter, vote.Emoji)
	if err != nil {
		t.Fatal("Failed to get vote", err)
	}
	if v.Count != 1 {
		t.Fatal("Bad vote count, expected 1, got:", v.Count)
	}

	for i := 0; i < 100; i++ {
		db.NewVote(vote)
	}

	v, err = db.GetVoteByCardIdAndVoterAndEmoji(vote.CardId, vote.Voter, vote.Emoji)
	if err != nil {
		t.Fatal("Failed to get vote", err)
	}
	if v.Count != 101 {
		t.Fatal("Bad vote count, expected 101, got:", v.Count)
	}
}

func TestCardSorting(t *testing.T) {
	db := newTestRepository()

	for i := 0; i < 50; i++ {
		cards, _ := db.GetCardsByRetrospectiveId("test-retro")
		err := db.MoveCard(cards[0], "Mixed", 1)
		if err != nil {
			t.Fatal("Failed to move card", err)
		}
		newCards, _ := db.GetCardsByRetrospectiveId("test-retro")
		if newCards[1].Id != cards[0].Id {
			t.Fatal("Card didn't move correctly after", i, "swaps")
		}
	}
}

func BenchmarkMoveCard(b *testing.B) {
	db := newTestRepository()

	cards, _ := db.GetCardsByRetrospectiveId("test-retro")
	for i := 0; i < b.N; i++ {
		from := rand.Intn(len(cards))
		to := rand.Intn(len(cards))
		err := db.MoveCard(cards[from], "Mixed", to)
		if err != nil {
			b.Fatal("Failed to move card", err)
		}
	}
}
func BenchmarkNewVote(b *testing.B) {
	db := newTestRepository()

	vote := &model.Vote{
		Id:      "test-vote",
		Created: time.Now(),
		Updated: time.Now(),
		CardId:  "test-card-0",
		Voter:   "voter",
		Count:   1,
	}

	for i := 0; i < b.N; i++ {
		db.NewVote(vote)
	}
}
