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

func (s *pubsubSubscriber) CardSubscribe(connectionId, channel string) (chan model.Card, error) {
	cardChan := make(chan model.Card, 100)
	topic, err := getTopic(s.client, channel)
	if err != nil {
		return nil, err
	}
	sub, err := s.client.CreateSubscription(
		context.Background(),
		"card-"+connectionId+"-"+channel,
		gpubsub.SubscriptionConfig{Topic: topic},
	)
	if err != nil {
		return nil, err
	}
	go sub.Receive(context.Background(), func(ctx context.Context, m *gpubsub.Message) {
		var card model.Card
		err := msgpack.Unmarshal(m.Data, &card)
		if err != nil {
			log.Println("ERROR: Failed to unmarshal card message")
		}
		cardChan <- card
		m.Ack()
	})

	return cardChan, nil
}

func (s *pubsubSubscriber) RetroSubscribe(connectionId, channel string) (chan model.Retrospective, error) {
	retroChan := make(chan model.Retrospective, 100)
	topic, err := getTopic(s.client, channel)
	if err != nil {
		return nil, err
	}
	sub, err := s.client.CreateSubscription(
		context.Background(),
		"retro-"+connectionId+"-"+channel,
		gpubsub.SubscriptionConfig{Topic: topic},
	)
	if err != nil {
		return nil, err
	}
	go sub.Receive(context.Background(), func(ctx context.Context, m *gpubsub.Message) {
		var retro model.Retrospective
		err := msgpack.Unmarshal(m.Data, &retro)
		if err != nil {
			log.Println("ERROR: Failed to unmarshal retro message")
		}
		retroChan <- retro
		m.Ack()
	})

	return retroChan, nil
}

func NewSubscriber(client *gpubsub.Client) pubsub.Subscriber {
	return &pubsubSubscriber{client}
}

func NewPublisher(client *gpubsub.Client) pubsub.Publisher {
	return &pubsubPublisher{client}
}
