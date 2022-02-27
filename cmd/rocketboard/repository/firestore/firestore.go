package firestore

import (
	"context"
	"fmt"
	"log"
	"math"

	"cloud.google.com/go/firestore"
	"github.com/rocketdynamics/rocketboard/cmd/rocketboard/model"
	"google.golang.org/api/iterator"
)

// Space elements by 2^15, which allows for 15 divisions before re-sorting
var IDX_SPACING = int(math.Exp2(15))

type firestoreRepository struct {
	client       *firestore.Client
	observations *firestore.CollectionRef
	retros       *firestore.CollectionRef
	cards        *firestore.CollectionRef
	votes        *firestore.CollectionRef
	statuses     *firestore.CollectionRef
}

func NewRepository() (*firestoreRepository, error) {
	ctx := context.Background()
	client, err := firestore.NewClient(ctx, "rocketboard")
	if err != nil {
		return nil, err
	}

	db := &firestoreRepository{client: client}
	db.observations = db.client.Collection("Observations")
	db.retros = db.client.Collection("Retrospectives")
	db.cards = db.client.Collection("Cards")
	db.votes = db.client.Collection("Votes")
	db.statuses = db.client.Collection("Statuses")

	return db, nil
}

func (db *firestoreRepository) NewRetrospective(r *model.Retrospective) error {
	_, err := db.retros.Doc(r.Id).Create(context.Background(), r)
	return err
}

func (db *firestoreRepository) GetRetrospectiveById(id string) (*model.Retrospective, error) {
	var r model.Retrospective
	doc, err := db.retros.Doc(id).Get(context.Background())
	if err != nil {
		return nil, err
	}
	err = doc.DataTo(&r)
	return &r, err
}

func (db *firestoreRepository) GetRetrospectiveByPetName(petName string) (*model.Retrospective, error) {
	var r model.Retrospective
	doc, err := db.retros.Where("PetName", "==", petName).Documents(context.Background()).Next()
	if err != nil {
		return nil, err
	}
	err = doc.DataTo(&r)
	return &r, err
}

func (db *firestoreRepository) NewCard(c *model.Card) error {
	count := 0
	min := 0
	results := db.cards.
		Where("RetrospectiveId", "==", c.RetrospectiveId).
		Documents(context.Background())

	for {
		doc, err := results.Next()
		if err == iterator.Done {
			break
		}
		count = count + 1
		if err != nil {
			return err
		}
		var card model.Card
		if err := doc.DataTo(&card); err != nil {
			return err
		}
		if card.Column == c.Column && card.Position < min {
			min = card.Position
		}
	}

	if count > 100 {
		return fmt.Errorf("too many cards")
	}
	c.Position = min - IDX_SPACING
	_, err := db.cards.Doc(c.Id).Create(context.Background(), c)
	return err
}

func (db *firestoreRepository) reorderColumn(rId string, column string) {
	err := db.client.RunTransaction(context.Background(), func(ctx context.Context, tx *firestore.Transaction) error {
		results := tx.Documents(db.cards.
			Where("RetrospectiveId", "==", rId).
			Where("Column", "==", column).
			OrderBy("Position", firestore.Asc))
		i := 0
		for {
			doc, err := results.Next()
			if err == iterator.Done {
				break
			}
			if err != nil {
				log.Println("ERROR: Error reordering", err)
				return err
			}
			i = i + 1
			var c model.Card
			if err := doc.DataTo(&c); err != nil {
				return err
			}
			c.Position = IDX_SPACING * (i + 1)
			if err := tx.Set(doc.Ref, &c); err != nil {
				log.Println("ERROR: Error reordering", err)
				return err
			}
		}
		return nil
	})
	if err != nil {
		log.Println("ERROR: Error reordering", err)
	}
}

func (db *firestoreRepository) MergeCard(c *model.Card, mergedInto string) error {
	return db.client.RunTransaction(context.Background(), func(ctx context.Context, tx *firestore.Transaction) error {
		err := tx.Set(db.cards.Doc(c.Id), map[string]interface{}{
			"MergedInto": mergedInto,
		}, firestore.MergeAll)

		if err != nil {
			return err
		}

		for _, card := range c.MergedCards {
			err := tx.Set(db.cards.Doc(card.Id), map[string]interface{}{
				"MergedInto": mergedInto,
			}, firestore.MergeAll)
			if err != nil {
				return err
			}
		}
		return nil
	})
}

func (db *firestoreRepository) UnmergeCard(c *model.Card) error {
	_, err := db.cards.Doc(c.Id).Set(context.Background(), map[string]interface{}{
		"MergedInto": nil,
	}, firestore.MergeAll)
	return err
}

func (db *firestoreRepository) MoveCard(c *model.Card, column string, index int) error {
	if index < 0 {
		return fmt.Errorf("Cannot move to negative index")
	}

	cs := []*model.Card{}
	err := db.client.RunTransaction(context.Background(), func(ctx context.Context, tx *firestore.Transaction) error {
		results := tx.Documents(db.cards.
			Where("RetrospectiveId", "==", c.RetrospectiveId).
			Where("Column", "==", column).
			OrderBy("Position", firestore.Asc).
			Limit(index + 2))
		for {
			doc, err := results.Next()
			if err == iterator.Done {
				break
			}
			if err != nil {
				return err
			}
			var card model.Card
			if err := doc.DataTo(&card); err != nil {
				return err
			}
			if card.Id != c.Id {
				cs = append(cs, &card)
			}
		}

		position := 0
		if len(cs) == 0 {
			position = IDX_SPACING
		} else if index >= len(cs) {
			position = cs[len(cs)-1].Position + IDX_SPACING
		} else if index == 0 {
			position = cs[0].Position - IDX_SPACING
		} else {
			position = (cs[index].Position + cs[index-1].Position) / 2
		}

		err := tx.Set(db.cards.Doc(c.Id), map[string]interface{}{
			"Column":   column,
			"Position": position,
		}, firestore.MergeAll)
		if err != nil {
			return err
		}

		if index > 0 && len(cs) >= index && position-cs[index-1].Position < 4 || position < -int(math.Exp2(30)) || position > int(math.Exp2(30)) {
			go db.reorderColumn(c.RetrospectiveId, column)
		}

		return nil
	})
	return err
}

func (db *firestoreRepository) UpdateCard(c *model.Card) error {
	_, err := db.cards.Doc(c.Id).Set(context.Background(), c)
	return err
}

func (db *firestoreRepository) GetCardById(id string) (*model.Card, error) {
	var c model.Card
	doc, err := db.cards.Doc(id).Get(context.Background())
	if err != nil {
		return nil, err
	}
	if err := doc.DataTo(&c); err != nil {
		return nil, err
	}

	results := db.cards.
		Where("MergedInto", "==", id).
		OrderBy("Position", firestore.Asc).
		OrderBy("Id", firestore.Asc).
		Documents(context.Background())
	mergedCards := []*model.Card{}
	for {
		doc, err := results.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return nil, err
		}
		var c model.Card
		if err := doc.DataTo(&c); err != nil {
			return nil, err
		}
		mergedCards = append(mergedCards, &c)
	}

	c.MergedCards = mergedCards
	return &c, nil
}

func (db *firestoreRepository) GetCardsByRetrospectiveId(id string) ([]*model.Card, error) {
	allCards := []*model.Card{}
	unmergedCards := []*model.Card{}
	mergedCards := []*model.Card{}

	results := db.cards.
		Where("RetrospectiveId", "==", id).
		OrderBy("Position", firestore.Asc).
		Documents(context.Background())

	cardsById := map[string]*model.Card{}
	for {
		doc, err := results.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return nil, err
		}
		var card model.Card
		if err := doc.DataTo(&card); err != nil {
			return nil, err
		}
		allCards = append(allCards, &card)
		if card.MergedInto == nil {
			unmergedCards = append(unmergedCards, &card)
			cardsById[card.Id] = &card
		} else {
			mergedCards = append(mergedCards, &card)
		}
	}

	for _, card := range mergedCards {
		baseCard := cardsById[*card.MergedInto]
		if baseCard == nil {
			continue
		}
		if baseCard.MergedCards == nil {
			baseCard.MergedCards = []*model.Card{}
		}
		baseCard.MergedCards = append(baseCard.MergedCards, card)
	}

	return unmergedCards, nil
}

func (db *firestoreRepository) NewVote(v *model.Vote) error {
	_, err := db.votes.Doc(v.Id).Set(context.Background(), map[string]interface{}{
		"Id":      v.Id,
		"Created": v.Created,
		"Updated": v.Updated,
		"CardId":  v.CardId,
		"Voter":   v.Voter,
		"Emoji":   v.Emoji,
		"Count":   firestore.Increment(1),
	}, firestore.MergeAll)
	return err
}

func (db *firestoreRepository) GetVotesByCardId(id string) ([]*model.Vote, error) {
	vs := []*model.Vote{}
	results := db.votes.Where("CardId", "==", id).Documents(context.Background())
	for {
		doc, err := results.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return nil, err
		}
		var vote model.Vote
		if err := doc.DataTo(&vote); err != nil {
			return nil, err
		}
		vs = append(vs, &vote)
	}

	return vs, nil
}

func (db *firestoreRepository) GetVoteByCardIdAndVoterAndEmoji(id string, voter string, emoji string) (*model.Vote, error) {
	v := model.Vote{}
	results := db.votes.
		Where("CardId", "==", id).
		Where("Voter", "==", voter).
		Where("Emoji", "==", emoji).
		Documents(context.Background())
	for {
		doc, err := results.Next()
		if err == iterator.Done {
			return nil, fmt.Errorf("Vote not found")
		}
		if err != nil {
			return nil, err
		}
		doc.DataTo(&v)
		break
	}
	return &v, nil
}

func (db *firestoreRepository) GetTotalUniqueEmojis(id string) (int, error) {
	vs, err := db.GetVotesByCardId(id)
	emojis := map[string]bool{}
	if err != nil {
		return 0, err
	}
	var count int
	for _, v := range vs {
		if _, ok := emojis[v.Emoji]; !ok {
			count = count + 1
			emojis[v.Emoji] = true
		}
	}
	return count, nil
}

func (db *firestoreRepository) NewStatus(s *model.Status) error {
	_, err := db.statuses.Doc(s.Id).Set(context.Background(), s)
	return err
}

func (db *firestoreRepository) GetStatusById(id string) (*model.Status, error) {
	doc, err := db.statuses.Doc(id).Get(context.Background())
	if err != nil {
		return nil, err
	}
	var s model.Status
	err = doc.DataTo(&s)
	return &s, err
}

func (db *firestoreRepository) GetStatusesByCardId(id string) ([]*model.Status, error) {
	ss := []*model.Status{}
	results := db.statuses.Where("CardId", "==", id).Documents(context.Background())
	for {
		doc, err := results.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return nil, err
		}
		var status model.Status
		if err := doc.DataTo(&status); err != nil {
			return nil, err
		}
		ss = append(ss, &status)
	}
	return ss, nil
}

func (db *firestoreRepository) Healthcheck() error {
	_, err := db.retros.Doc("nonexist").Get(context.Background())
	return err
}
