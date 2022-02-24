package firestore

import (
	"context"

	"cloud.google.com/go/firestore"
)

type firestoreRepository struct {
	client       *firestore.Client
	observations *firestore.CollectionRef
}

func NewRepository() (*firestoreRepository, error) {
	ctx := context.Background()
	client, err := firestore.NewClient(ctx, "rocketboard")
	if err != nil {
		return nil, err
	}

	db := &firestoreRepository{client: client}
	db.observations = db.client.Collection("Observations")

	return db, nil
}
