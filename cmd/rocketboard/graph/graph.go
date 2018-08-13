package graph

import (
	"context"
	"github.com/arachnys/rocketboard/cmd/rocketboard/model"
)

type rocketboardService interface {
	StartRetrospective(string) (string, error)
	GetRetrospectiveById(string) (*model.Retrospective, error)
	AddCardToRetrospective(string, string, string, string) (string, error)
	MoveCard(string, string) error
	GetCardsForRetrospective(string) ([]*model.Card, error)
	GetCardById(string) (*model.Card, error)
	GetVotesByCardId(id string) ([]*model.Vote, error)
	NewVote(string, string) (*model.Vote, error)
}

type rootResolver struct {
	s rocketboardService
}

type cardResolver struct {
	*rootResolver
}

type retrospectiveResolver struct {
	*rootResolver
}

type mutationResolver struct {
	*rootResolver
}

type queryResolver struct {
	*rootResolver
}

func NewResolver(s rocketboardService) ResolverRoot {
	return &rootResolver{s}
}

func (r *rootResolver) Card() CardResolver {
	return &cardResolver{r}
}

func (r *rootResolver) Retrospective() RetrospectiveResolver {
	return &retrospectiveResolver{r}
}

func (r *rootResolver) RootMutation() RootMutationResolver {
	return &mutationResolver{r}
}

func (r *rootResolver) RootQuery() RootQueryResolver {
	return &queryResolver{r}
}

func (r *retrospectiveResolver) Cards(ctx context.Context, obj *model.Retrospective) ([]*model.Card, error) {
	cards, _ := r.s.GetCardsForRetrospective(obj.Id)
	return cards, nil
}

func (r *retrospectiveResolver) Columns(ctx context.Context, obj *model.Retrospective) ([]*Column, error) {
	cards, err := r.s.GetCardsForRetrospective(obj.Id)
	if err != nil {
		// return nil, err
		return []*Column{}, nil
	}

	cardsByColumn := make(map[string][]*model.Card)
	for _, c := range cards {
		if cardsByColumn[c.Column] == nil {
			cardsByColumn[c.Column] = make([]*model.Card, 0)
		}
		cardsByColumn[c.Column] = append(cardsByColumn[c.Column], c)
	}

	columns := make([]*Column, 0)
	for columnName, cards := range cardsByColumn {
		cn := columnName
		columns = append(columns, &Column{
			Name:  &cn,
			Cards: cards,
		})
	}

	return columns, nil
}

func (r *cardResolver) Votes(ctx context.Context, obj *model.Card) ([]*model.Vote, error) {
	return r.s.GetVotesByCardId(obj.Id)
}

func (r *queryResolver) RetrospectiveByID(ctx context.Context, id string) (*model.Retrospective, error) {
	return r.s.GetRetrospectiveById(id)
}

func (r *mutationResolver) StartRetrospective(ctx context.Context, name *string) (string, error) {
	return r.s.StartRetrospective(*name)
}

func (r *mutationResolver) MoveCard(ctx context.Context, id string, column string) (string, error) {
	if err := r.s.MoveCard(id, column); err != nil {
		return "", err
	}
	return column, nil
}

func (r *mutationResolver) NewVote(ctx context.Context, cardId string) (model.Vote, error) {
	v, err := r.s.NewVote(cardId, "unknownVoter")
	if err == nil {
		return *v, err
	} else {
		return model.Vote{}, err
	}
}

func (r *mutationResolver) AddCardToRetrospective(ctx context.Context, rId string, column *string, message *string) (string, error) {
	id, err := r.s.AddCardToRetrospective(rId, *column, *message, "unknown user")
	if err != nil {
		return "", err
	}

	return id, nil
}
