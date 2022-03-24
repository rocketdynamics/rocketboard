package gcloudpubsub

import (
	"context"
	"log"

	gpubsub "cloud.google.com/go/pubsub"
	"github.com/vmihailenco/msgpack"

	"github.com/rocketdynamics/rocketboard/cmd/rocketboard/model"
	"github.com/rocketdynamics/rocketboard/cmd/rocketboard/pubsub"
)

type pubsubSubscriber struct {
	client *gpubsub.Client
}

type pubsubPublisher struct {
	client *gpubsub.Client
}

func getTopic(client *gpubsub.Client, channel string) (*gpubsub.Topic, error) {
	topic := client.Topic(channel)
	ok, err := topic.Exists(context.Background())
	if err != nil {
		return nil, err
	}
	if !ok {
		return client.CreateTopic(context.Background(), channel)
	}

	return topic, nil
}

func (s *pubsubPublisher) Publish(channel string, message []byte) error {
	topic, err := getTopic(s.client, channel)
	if err != nil {
		return err
	}
	topic.Publish(context.Background(), &gpubsub.Message{Data: message})
	topic.Stop()
	return nil
}

var cardSubscriptions = map[string]chan *model.Card{}

func (s *pubsubSubscriber) CardSubscribe(connectionId, channel string) (chan *model.Card, func() error, error) {
	if cardSubscriptions["card-"+connectionId+"-"+channel] != nil {
		return cardSubscriptions["card-"+connectionId+"-"+channel], func() error { return nil }, nil
	}

	cardChan := make(chan *model.Card, 100)
	topic, err := getTopic(s.client, channel)
	if err != nil {
		return nil, nil, err
	}
	sub, err := s.client.CreateSubscription(
		context.Background(),
		"card-"+connectionId+"-"+channel,
		gpubsub.SubscriptionConfig{Topic: topic},
	)
	if err != nil {
		return nil, nil, err
	}
	go sub.Receive(context.Background(), func(ctx context.Context, m *gpubsub.Message) {
		var card model.Card
		err := msgpack.Unmarshal(m.Data, &card)
		if err != nil {
			log.Println("ERROR: Failed to unmarshal card message")
		}
		cardChan <- &card
		m.Ack()
	})
	cardSubscriptions["card-"+connectionId+"-"+channel] = cardChan

	return cardChan, func() error {
		return sub.Delete(context.Background())
	}, nil
}

var retroSubscriptions = map[string]chan *model.Retrospective{}

func (s *pubsubSubscriber) RetroSubscribe(connectionId, channel string) (chan *model.Retrospective, func() error, error) {
	if retroSubscriptions["retro-"+connectionId+"-"+channel] != nil {
		return retroSubscriptions["retro-"+connectionId+"-"+channel], func() error { return nil }, nil
	}
	retroChan := make(chan *model.Retrospective, 100)
	topic, err := getTopic(s.client, channel)
	if err != nil {
		return nil, nil, err
	}
	sub, err := s.client.CreateSubscription(
		context.Background(),
		"retro-"+connectionId+"-"+channel,
		gpubsub.SubscriptionConfig{Topic: topic},
	)
	if err != nil {
		return nil, nil, err
	}
	go sub.Receive(context.Background(), func(ctx context.Context, m *gpubsub.Message) {
		var retro model.Retrospective
		err := msgpack.Unmarshal(m.Data, &retro)
		if err != nil {
			log.Println("ERROR: Failed to unmarshal retro message")
		}
		retroChan <- &retro
		m.Ack()
	})
	retroSubscriptions["retro-"+connectionId+"-"+channel] = retroChan
	return retroChan, func() error {
		return sub.Delete(context.Background())
	}, nil
}

func NewSubscriber(client *gpubsub.Client) pubsub.Subscriber {
	return &pubsubSubscriber{client}
}

func NewPublisher(client *gpubsub.Client) pubsub.Publisher {
	return &pubsubPublisher{client}
}
