package firestore

import (
	"context"
	"log"
	"sort"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/rocketdynamics/rocketboard/cmd/rocketboard/model"
	"google.golang.org/api/iterator"
)

func (db *firestoreRepository) getObservation(connectionid string) (*model.Observation, error) {
	var observation model.Observation
	results := db.observations.Where("ConnectionId", "==", connectionid).Documents(context.Background())
	for {
		doc, err := results.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return nil, err
		}
		doc.DataTo(observation)
		return &observation, nil
	}
	return nil, nil
}

func (db *firestoreRepository) Observe(connectionid string, user string, retrospectiveId string, state string) (bool, error) {
	changed := false
	userState, _ := model.UserStateTypeString(state)
	err := db.client.RunTransaction(context.Background(), func(ctx context.Context, tx *firestore.Transaction) error {
		var observation model.Observation
		docRef := db.observations.Doc(connectionid)
		doc, err := tx.Get(docRef)
		if err == nil {
			doc.DataTo(&observation)
			if observation.State != userState {
				changed = true
				observation.State = userState
				if err := tx.Set(docRef, &observation); err != nil {
					return err
				}
			}
		} else {
			observation = model.Observation{
				User:            user,
				RetrospectiveId: retrospectiveId,
				ConnectionId:    connectionid,
				State:           userState,
			}
			if err := tx.Create(docRef, &observation); err != nil {
				return err
			}
			changed = true
		}
		return nil
	})
	return changed, err
}

func (db *firestoreRepository) ClearObservations(connectionid string) {
	results := db.observations.Where("ConnectionId", "==", connectionid).Documents(context.Background())

	batch := db.client.Batch()
	numDeletions := 0
	for {
		doc, err := results.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			log.Println("Error iterating observations for delete", err)
			return
		}

		batch.Delete(doc.Ref)
		numDeletions++
	}
	if numDeletions > 0 {
		_, err := batch.Commit(context.Background())
		if err != nil {
			log.Println("Error deleting observations", err)
		}
	}
}

func (db *firestoreRepository) GetActiveUsers(retrospectiveId string) ([]*model.UserState, error) {
	results := db.observations.Where(
		"RetrospectiveId", "==", retrospectiveId,
	).Where(
		"LastSeen", ">", time.Now().Add(-10*time.Second),
	).Documents(context.Background())
	userStates := map[string]model.UserState{}

	for {
		doc, err := results.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return nil, err
		}
		var state model.UserState
		if err := doc.DataTo(&state); err != nil {
			return nil, err
		}
		if state.State > userStates[state.User].State {
			userStates[state.User] = state
		}
	}

	stateSlice := []*model.UserState{}
	for _, userState := range userStates {
		stateSlice = append(stateSlice, &userState)
	}

	sort.Slice(stateSlice, func(i, j int) bool {
		return stateSlice[i].FirstSeen.Before(stateSlice[j].FirstSeen)
	})

	return stateSlice, nil
}
