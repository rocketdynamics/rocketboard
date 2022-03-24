package firestore

import (
	"fmt"
	"log"
	"math/rand"
	"testing"
	"time"

	"github.com/rocketdynamics/rocketboard/cmd/rocketboard/model"
)

func init() {
	rand.Seed(1337)
}

var numTestRepo = 0

type testRepo struct {
	prefix string
	db     *firestoreRepository
}

func newTestRepository() *testRepo {
	prefix := fmt.Sprint(numTestRepo) + "-"
	numTestRepo = numTestRepo + 1
	db, err := NewRepository()
	if err != nil {
		log.Fatal(err)
	}

	err = db.NewRetrospective(&model.Retrospective{
		Id: prefix + "test-retro",
	})

	if err != nil {
		log.Fatal("Failed to create retro", err)
	}

	for i := 0; i < 100; i++ {
		err := db.NewCard(&model.Card{
			Id:              prefix + "test-card-" + fmt.Sprint(i),
			RetrospectiveId: prefix + "test-retro",
			Column:          "Mixed",
		})
		if err != nil {
			log.Fatal("Failed to create card", err)
		}
	}
	return &testRepo{
		db:     db,
		prefix: prefix,
	}
}

func TestNewVote(t *testing.T) {
	db := newTestRepository()

	vote := &model.Vote{
		Id:      db.prefix + "test-vote",
		Created: time.Now(),
		Updated: time.Now(),
		CardId:  db.prefix + "test-card-0",
		Voter:   "voter",
		Emoji:   "clap",
		Count:   1,
	}

	err := db.db.NewVote(vote)
	if err != nil {
		t.Fatal("Failed to create vote", err)
	}
	v, err := db.db.GetVoteByCardIdAndVoterAndEmoji(vote.CardId, vote.Voter, vote.Emoji)
	if err != nil {
		t.Fatal("Failed to get vote", err)
	}
	if v.Count != 1 {
		t.Fatal("Bad vote count, expected 1, got:", v.Count)
	}

	for i := 0; i < 100; i++ {
		vote.Count++
		db.db.NewVote(vote)
	}

	v, err = db.db.GetVoteByCardIdAndVoterAndEmoji(vote.CardId, vote.Voter, vote.Emoji)
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
		cards, err := db.db.GetCardsByRetrospectiveId(db.prefix + "test-retro")
		if err != nil {
			t.Fatal("Failed to get cards", err)
		}
		err = db.db.MoveCard(cards[0], "Mixed", 1)
		if err != nil {
			t.Fatal("Failed to move card", err)
		}
		newCards, _ := db.db.GetCardsByRetrospectiveId(db.prefix + "test-retro")
		if newCards[1].Id != cards[0].Id {
			t.Fatal("Card didn't move correctly after", i, "swaps")
		}
	}
}

func BenchmarkMoveCard(b *testing.B) {
	db := newTestRepository()

	cards, _ := db.db.GetCardsByRetrospectiveId(db.prefix + "test-retro")
	for i := 0; i < b.N; i++ {
		from := rand.Intn(len(cards))
		to := rand.Intn(len(cards))
		err := db.db.MoveCard(cards[from], "Mixed", to)
		if err != nil {
			b.Fatal("Failed to move card", err)
		}
	}
}
func BenchmarkNewVote(b *testing.B) {
	db := newTestRepository()

	vote := &model.Vote{
		Id:      db.prefix + "test-vote",
		Created: time.Now(),
		Updated: time.Now(),
		CardId:  db.prefix + "test-card-0",
		Voter:   "voter",
		Count:   1,
	}

	for i := 0; i < b.N; i++ {
		db.db.NewVote(vote)
	}
}
