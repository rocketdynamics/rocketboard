package graph

import (
	"context"
	"github.com/arachnys/rocketboard/cmd/rocketboard/model"
)

type rocketboardService interface {
	StartRetrospective(string) (string, error)
	GetRetrospectiveById(string) (*model.Retrospective, error)
	AddCardToRetrospective(string, string, string, string) (string, error)
	GetCardsForRetrospective(string) ([]*model.Card, error)
}

type rootResolver struct {
	s rocketboardService
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

func (r *rootResolver) Retrospective() RetrospectiveResolver {
	return &retrospectiveResolver{r}
}

func (r *rootResolver) RootMutation() RootMutationResolver {
	return &mutationResolver{r}
}

func (r *rootResolver) RootQuery() RootQueryResolver {
	return &queryResolver{r}
}

func (r *retrospectiveResolver) Columns(ctx context.Context, obj *model.Retrospective) ([]*Column, error) {
	cards, err := r.s.GetCardsForRetrospective(obj.Id)
	if err != nil {
		return nil, err
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
		columns = append(columns, &Column{
			Name:  &columnName,
			Cards: cards,
		})
	}

	return columns, nil
}

func (r *queryResolver) RetrospectiveByID(ctx context.Context, id *string) (*model.Retrospective, error) {
	return r.s.GetRetrospectiveById(*id)
}

func (r *mutationResolver) StartRetrospective(ctx context.Context, name *string) (string, error) {
	return r.s.StartRetrospective(*name)
}

func (r *mutationResolver) AddCardToRetrospective(ctx context.Context, rId *string, column *string, message *string) (string, error) {
	return r.s.AddCardToRetrospective(*rId, *column, *message, "unknown user")
}
