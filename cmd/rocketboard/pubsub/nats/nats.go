package nats

import (
	"log"

	"github.com/nats-io/go-nats"
	"github.com/vmihailenco/msgpack"

	"github.com/rocketdynamics/rocketboard/cmd/rocketboard/model"
	"github.com/rocketdynamics/rocketboard/cmd/rocketboard/pubsub"
)

type natsSubscriber struct {
	nc *nats.Conn
}

func (s *natsSubscriber) CardSubscribe(channel string) (chan model.Card, error) {
	cardChan := make(chan model.Card, 100)
	natsChan := make(chan *nats.Msg, 100)
	sub, err := s.nc.ChanSubscribe(channel, natsChan)
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
		sub.Unsubscribe()
		close(natsChan)
	}(natsChan, cardChan)

	return cardChan, nil
}

func (s *natsSubscriber) RetroSubscribe(channel string) (chan model.Retrospective, error) {
	retroChan := make(chan model.Retrospective, 100)
	natsChan := make(chan *nats.Msg, 100)
	sub, err := s.nc.ChanSubscribe(channel, natsChan)
	if err != nil {
		log.Println("ERROR: Failed to subscribe to retro channel")
		return nil, err
	}
	go func(natsChan chan *nats.Msg, retroChan chan model.Retrospective) {
		for msg := range natsChan {
			var retro model.Retrospective
			err := msgpack.Unmarshal(msg.Data, &retro)
			if err != nil {
				log.Println("ERROR: Failed to unmarshal retro message")
			}
			retroChan <- retro
		}
		sub.Unsubscribe()
		close(natsChan)
	}(natsChan, retroChan)

	return retroChan, nil
}

func NatsSubscriber(nc *nats.Conn) pubsub.Subscriber {
	return &natsSubscriber{nc}
}
