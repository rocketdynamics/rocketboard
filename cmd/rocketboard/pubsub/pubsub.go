package pubsub

import (
	"github.com/rocketdynamics/rocketboard/cmd/rocketboard/model"
)

type Publisher interface {
	Publish(channel string, message []byte) error
}

type Subscriber interface {
	CardSubscribe(connectionId, channel string) (chan model.Card, error)
	RetroSubscribe(connectionId, channel string) (chan model.Retrospective, error)
}