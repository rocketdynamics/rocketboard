package graph

import (
	"context"
	"github.com/nats-io/go-nats"
	"github.com/vmihailenco/msgpack"
	"golang.org/x/time/rate"
	"log"
	"os"

	"github.com/arachnys/rocketboard/cmd/rocketboard/model"
)

type Update struct {
	Card          *model.Card
	Retrospective *model.Retrospective
}

type CountedLimiter struct {
	*rate.Limiter
	Count int
}

var nc *nats.Conn

var subChannels = make(map[string]map[string]chan model.Card)
var userLimiters = make(map[string]*CountedLimiter)

func InitMessageQueue() {
	var err error
	nc, err = nats.Connect(os.Getenv("NATS_ADDR"))
	if err != nil {
		log.Fatal("could not connect to nats")
	}
}

func (r *rootResolver) sendCardToSubs(c *model.Card) {
	b, _ := msgpack.Marshal(c)
	nc.Publish("cards-"+c.RetrospectiveId, b)
}

func (r *rootResolver) sendRetroToSubs(retro *model.Retrospective) {
	b, _ := msgpack.Marshal(retro)
	nc.Publish("retros-"+retro.Id, b)
}

func (r *subscriptionResolver) CardChanged(ctx context.Context, rId string) (<-chan model.Card, error) {
	cardChan := make(chan model.Card, 100)

	user := ctx.Value("email").(string)
	r.mu.Lock()
	if userLimiters[user] != nil {
		userLimiters[user].Count += 1
	} else {
		userLimiters[user] = &CountedLimiter{rate.NewLimiter(10, 100), 1}
	}
	r.mu.Unlock()

	natsChan := make(chan *nats.Msg, 100)
	sub, err := nc.ChanSubscribe("cards-"+rId, natsChan)
	if err != nil {
		log.Println("ERROR: Failed to subscribe to card channel")
		return nil, err
	}
	go func(natsChan chan *nats.Msg, cardChan chan model.Card) {
		for msg := range natsChan {
			var card model.Card
			err := msgpack.Unmarshal(msg.Data, &card)
			if err != nil {
				log.Println("ERROR: Failed to unmarshal card message")
			}
			cardChan <- card
		}
	}(natsChan, cardChan)

	// Send the retro subscription to notify of new online user.
	retro, err := r.s.GetRetrospectiveById(rId)
	if err == nil {
		r.sendRetroToSubs(retro)
	}

	go func() {
		<-ctx.Done()
		r.mu.Lock()
		userLimiters[user].Count -= 1
		if userLimiters[user].Count == 0 {
			delete(userLimiters, user)
			// Send the retro subscription to notify of new offline user.
			retro, err := r.s.GetRetrospectiveById(rId)
			if err == nil {
				r.sendRetroToSubs(retro)
			}
		}
		r.mu.Unlock()
		sub.Unsubscribe()
		close(natsChan)
	}()

	return cardChan, nil
}

func (r *subscriptionResolver) RetroChanged(ctx context.Context, rId string) (<-chan model.Retrospective, error) {
	retroChan := make(chan model.Retrospective, 100)

	natsChan := make(chan *nats.Msg, 100)
	sub, err := nc.ChanSubscribe("retros-"+rId, natsChan)
	if err != nil {
		log.Println("ERROR: Failed to subscribe to card channel")
		return nil, err
	}
	go func(natsChan chan *nats.Msg, retroChan chan model.Retrospective) {
		for msg := range natsChan {
			var retro model.Retrospective
			err = msgpack.Unmarshal(msg.Data, &retro)
			if err != nil {
				log.Println("ERROR: Failed to unmarshal retro message")
			}
			retroChan <- retro
		}
	}(natsChan, retroChan)

	go func() {
		<-ctx.Done()
		sub.Unsubscribe()
		close(natsChan)
	}()

	return retroChan, nil
}
