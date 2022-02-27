package graph

import (
	"context"
	"github.com/nats-io/gnatsd/server"
	"github.com/nats-io/go-nats"
	"github.com/vmihailenco/msgpack"
	"golang.org/x/time/rate"
	"log"
	"os"
	"time"

	"github.com/rocketdynamics/rocketboard/cmd/rocketboard/model"
	"github.com/rocketdynamics/rocketboard/cmd/rocketboard/pubsub"
	rocketNats "github.com/rocketdynamics/rocketboard/cmd/rocketboard/pubsub/nats"
)

type Update struct {
	Card          *model.Card
	Retrospective *model.Retrospective
}

type CountedLimiter struct {
	*rate.Limiter
	Count int
}

var pub pubsub.Publisher
var sub pubsub.Subscriber

var subChannels = make(map[string]map[string]chan model.Card)
var userLimiters = make(map[string]*CountedLimiter)

func startLocalNats() {
	opts := server.Options{}

	// Create the server with appropriate options.
	s := server.New(&opts)

	// Configure the logger based on the flags
	s.ConfigureLogger()

	// Start things up. Block here until done.
	if err := server.Run(s); err != nil {
		server.PrintAndDie(err.Error())
	}
}

func InitMessageQueue() {
	var lastErr error
	nats_addr := os.Getenv("NATS_ADDR")
	if nats_addr == "" {
		log.Println("No NATS_ADDR specified, starting local nats")
		go startLocalNats()
		nats_addr = "nats://localhost:4222"
	}

	for tries := 50; tries > 0; tries -= 1 {
		nc, err := nats.Connect(nats_addr)
		lastErr = err
		pub = nc
		sub = rocketNats.NatsSubscriber(nc)
		if err == nil {
			break
		}
		time.Sleep(100 * time.Millisecond)
	}
	if lastErr != nil {
		log.Fatal("could not connect to nats")
	}
}

func (r *rootResolver) sendCardToSubs(c *model.Card) {
	b, _ := msgpack.Marshal(c)
	pub.Publish("cards-"+c.RetrospectiveId, b)
}

func (r *rootResolver) sendRetroToSubs(retro *model.Retrospective) {
	b, _ := msgpack.Marshal(retro)
	pub.Publish("retros-"+retro.Id, b)
}

func (r *rootResolver) sendRetroToSubsById(rId string) {
	retro, _ := r.s.GetRetrospectiveById(rId)
	b, _ := msgpack.Marshal(retro)
	pub.Publish("retros-"+retro.Id, b)
}

func (r *subscriptionResolver) CardChanged(ctx context.Context, rId string) (<-chan model.Card, error) {
	user := ctx.Value("email").(string)
	connectionId := ctx.Value("connectionId").(string)
	r.mu.Lock()
	if userLimiters[user] != nil {
		userLimiters[user].Count += 1
	} else {
		userLimiters[user] = &CountedLimiter{rate.NewLimiter(10, 100), 1}
	}
	r.mu.Unlock()

	go func() {
		<-ctx.Done()
		r.o.ClearObservations(connectionId)
		// Re-send retro to subs to update online users.
		r.sendRetroToSubsById(rId)
		r.mu.Lock()
		userLimiters[user].Count -= 1
		if userLimiters[user].Count == 0 {
			delete(userLimiters, user)
		}
		r.mu.Unlock()
	}()

	return sub.CardSubscribe("cards-" + rId)

}

func (r *subscriptionResolver) RetroChanged(ctx context.Context, rId string) (<-chan model.Retrospective, error) {
	defer func() {
		// Send initial retro update incase we missed something
		r.sendRetroToSubsById(rId)
	}()

	// go func() {
	// 	<-ctx.Done()
	// 	close()
	// }()

	return sub.RetroSubscribe("retros-" + rId)
}
