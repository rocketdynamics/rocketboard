package graph

import (
	"context"
	"github.com/arachnys/rocketboard/cmd/rocketboard/model"
	"sync"
)

type rocketboardService interface {
	StartRetrospective(string) (string, error)
	GetRetrospectiveById(string) (*model.Retrospective, error)
	AddCardToRetrospective(string, string, string, string) (string, error)
	MoveCard(string, string) error
	UpdateMessage(string, string) error
	GetCardsForRetrospective(string) ([]*model.Card, error)
	GetCardById(string) (*model.Card, error)
	GetVotesByCardId(string) ([]*model.Vote, error)
	NewVote(string, string) (*model.Vote, error)
	GetCardStatuses(string) ([]*model.Status, error)
	SetStatus(string, model.StatusType) (string, error)
	GetStatusById(string) (*model.Status, error)

	NewUlid() string
}

type rootResolver struct {
	s  rocketboardService
	mu sync.Mutex
}

type cardResolver struct {
	*rootResolver
}

type retrospectiveResolver struct {
	*rootResolver
}

type subscriptionResolver struct {
	*rootResolver
}

type mutationResolver struct {
	*rootResolver
}

type queryResolver struct {
	*rootResolver
}

func NewResolver(s rocketboardService) ResolverRoot {
	return &rootResolver{s, sync.Mutex{}}
}

func (r *rootResolver) Card() CardResolver {
	return &cardResolver{r}
}

func (r *rootResolver) Retrospective() RetrospectiveResolver {
	return &retrospectiveResolver{r}
}

func (r *rootResolver) Subscription() SubscriptionResolver {
	return &subscriptionResolver{r}
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

func (r *cardResolver) Statuses(ctx context.Context, obj *model.Card) ([]*model.Status, error) {
	return r.s.GetCardStatuses(obj.Id)
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
	c, _ := r.s.GetCardById(id)
	r.sendCardToSubs(c)
	return column, nil
}

func (r *mutationResolver) UpdateMessage(ctx context.Context, id string, message string) (string, error) {
	if err := r.s.UpdateMessage(id, message); err != nil {
		return "", err
	}
	c, _ := r.s.GetCardById(id)
	r.sendCardToSubs(c)
	return message, nil
}

func (r *mutationResolver) NewVote(ctx context.Context, cardId string) (model.Vote, error) {
	v, err := r.s.NewVote(cardId, ctx.Value("email").(string))
	if err == nil {
		c, _ := r.s.GetCardById(cardId)
		r.sendCardToSubs(c)
		return *v, err
	} else {
		return model.Vote{}, err
	}
}

func (r *mutationResolver) AddCardToRetrospective(ctx context.Context, rId string, column *string, message *string) (string, error) {
	id, err := r.s.AddCardToRetrospective(rId, *column, *message, ctx.Value("email").(string))
	if err != nil {
		return "", err
	}
	c, _ := r.s.GetCardById(id)
	r.sendCardToSubs(c)
	return id, nil
}

func (r *mutationResolver) UpdateStatus(ctx context.Context, id string, status model.StatusType) (model.Status, error) {
	sid, err := r.s.SetStatus(id, status)
	if err != nil {
		return model.Status{}, err
	}

	s, err := r.s.GetStatusById(sid)
	if err != nil {
		return model.Status{}, err
	}

	return *s, nil
}

var cardSubs = make(map[string]map[string]chan model.Card)

func (r *rootResolver) sendCardToSubs(c *model.Card) {
	r.mu.Lock()
	if c != nil && cardSubs[c.RetrospectiveId] != nil {
		for _, subChan := range cardSubs[c.RetrospectiveId] {
			subChan <- *c
		}
	}
	r.mu.Unlock()
}

func (r *subscriptionResolver) CardChanged(ctx context.Context, rId string) (<-chan model.Card, error) {
	subChan := make(chan model.Card, 1)
	id := r.s.NewUlid()

	r.mu.Lock()
	if cardSubs[rId] == nil {
		cardSubs[rId] = make(map[string]chan model.Card)
	}
	cardSubs[rId][id] = subChan
	r.mu.Unlock()

	go func() {
		<-ctx.Done()
		r.mu.Lock()
		delete(cardSubs[rId], id)
		r.mu.Unlock()
	}()

	return subChan, nil
}
