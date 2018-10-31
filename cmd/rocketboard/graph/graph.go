package graph

import (
	"context"
	"github.com/arachnys/rocketboard/cmd/rocketboard/model"
	"sync"
)

type rocketboardService interface {
	StartRetrospective(string) (string, error)
	GetRetrospectiveById(string) (*model.Retrospective, error)
	GetRetrospectiveByPetName(string) (*model.Retrospective, error)
	AddCardToRetrospective(string, string, string, string) (string, error)
	MoveCard(string, string, int) error
	UpdateMessage(string, string) error
	GetCardsForRetrospective(string) ([]*model.Card, error)
	GetCardById(string) (*model.Card, error)
	GetVotesByCardId(string) ([]*model.Vote, error)
	GetVoteByCardIdAndVoterAndEmoji(string, string, string) (*model.Vote, error)
	NewVote(string, string, string) (*model.Vote, error)
	GetCardStatuses(string) ([]*model.Status, error)
	SetStatus(string, model.StatusType) (string, error)
	GetStatusById(string) (*model.Status, error)
}

type observationStore interface {
	Observe(string, string, string, string) (bool, error)
	GetActiveUsers(string) ([]model.UserState, error)
	ClearObservations(string)
}

type rootResolver struct {
	s  rocketboardService
	o  observationStore
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

func NewResolver(s rocketboardService, o observationStore) ResolverRoot {
	return &rootResolver{s, o, sync.Mutex{}}
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
func (r *retrospectiveResolver) OnlineUsers(ctx context.Context, obj *model.Retrospective) ([]model.UserState, error) {
	return r.o.GetActiveUsers(obj.Id)
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

func (r *queryResolver) RetrospectiveByPetName(ctx context.Context, petName string) (*model.Retrospective, error) {
	return r.s.GetRetrospectiveByPetName(petName)
}

func (r *mutationResolver) StartRetrospective(ctx context.Context, name *string) (string, error) {
	return r.s.StartRetrospective(*name)
}

func (r *mutationResolver) MoveCard(ctx context.Context, id string, column string, index int) (int, error) {
	if err := r.s.MoveCard(id, column, index); err != nil {
		return -1, err
	}
	c, _ := r.s.GetCardById(id)
	r.sendCardToSubs(c)
	return c.Position, nil
}

func (r *mutationResolver) UpdateMessage(ctx context.Context, id string, message string) (string, error) {
	if err := r.s.UpdateMessage(id, message); err != nil {
		return "", err
	}
	c, _ := r.s.GetCardById(id)
	r.sendCardToSubs(c)
	return message, nil
}

func (r *mutationResolver) NewVote(ctx context.Context, cardId string, emoji string) (model.Vote, error) {
	voter := ctx.Value("email").(string)
	r.mu.Lock()
	limiter := userLimiters[voter]
	r.mu.Unlock()

	if limiter != nil && !limiter.Allow() {
		// If rate limited, just return existing vote (without incrementing)
		vote, err := r.s.GetVoteByCardIdAndVoterAndEmoji(cardId, voter, emoji)
		return *vote, err
	}

	v, err := r.s.NewVote(cardId, voter, emoji)
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

	go func() {
		c, _ := r.s.GetCardById(id)
		r.sendCardToSubs(c)
	}()

	return *s, nil
}

func (r *mutationResolver) SendHeartbeat(ctx context.Context, rId string, state string) (string, error) {
	user := ctx.Value("email").(string)
	connectionId := ctx.Value("connectionId").(string)

	if changed, _ := r.o.Observe(connectionId, user, rId, state); changed {
		r.sendRetroToSubsById(rId)
	}
	return "", nil
}
