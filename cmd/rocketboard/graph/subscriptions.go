package graph

import (
	"context"
	"log"
	"os"
	"time"

	gpubsub "cloud.google.com/go/pubsub"
	"github.com/nats-io/gnatsd/server"
	"github.com/nats-io/go-nats"
	"github.com/vmihailenco/msgpack"
	"golang.org/x/time/rate"

	"github.com/rocketdynamics/rocketboard/cmd/rocketboard/model"
	"github.com/rocketdynamics/rocketboard/cmd/rocketboard/pubsub"
	"github.com/rocketdynamics/rocketboard/cmd/rocketboard/pubsub/gcloudpubsub"
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

func InitNatsMessageQueue() {
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
		pub = rocketNats.NewPublisher(nc)
		sub = rocketNats.NewSubscriber(nc)
		if err == nil {
			break
		}
		time.Sleep(100 * time.Millisecond)
	}
	if lastErr != nil {
		log.Fatal("could not connect to nats")
	}
}

func InitGcloudMessageQueue() {
	client, err := gpubsub.NewClient(context.Background(), "rocketboard")

	pub = gcloudpubsub.NewPublisher(client)
	sub = gcloudpubsub.NewSubscriber(client)
	if err != nil {
		log.Fatal("could not connect to gcloud message queue:", err)
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
	retro, err := r.s.GetRetrospectiveById(rId)
	if err != nil {
		return
	}
	b, _ := msgpack.Marshal(retro)
	pub.Publish("retros-"+retro.Id, b)
}

func (r *subscriptionResolver) CardChanged(ctx context.Context, rId string) (<-chan *model.Card, error) {
	user := ctx.Value("email").(string)
	connectionId := ctx.Value("connectionId").(string)
	r.mu.Lock()
	if userLimiters[user] != nil {
		userLimiters[user].Count += 1
	} else {
		userLimiters[user] = &CountedLimiter{rate.NewLimiter(10, 100), 1}
	}
	r.mu.Unlock()

	channel, cleanup, err := sub.CardSubscribe(connectionId, "cards-"+rId)
	if err != nil {
		return nil, err
	}

	go func() {
		<-ctx.Done()
		cleanup()
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

	return channel, err

}

func (r *subscriptionResolver) RetroChanged(ctx context.Context, rId string) (<-chan *model.Retrospective, error) {
	connectionId := ctx.Value("connectionId").(string)
	defer func() {
		// Send initial retro update incase we missed something
		r.sendRetroToSubsById(rId)
	}()

	channel, cleanup, err := sub.RetroSubscribe(connectionId, "retros-"+rId)
	if err != nil {
		return nil, err
	}

	go func() {
		<-ctx.Done()
		cleanup()
	}()

	return channel, err
}
