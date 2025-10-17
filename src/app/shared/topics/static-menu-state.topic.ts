import { Topic, TopicPublisher } from '@onecx/accelerator'

export interface StaticMenuState {
  isVisible: boolean
}

export class StaticMenuStatePublisher extends TopicPublisher<StaticMenuState> {
  constructor() {
    super('staticMenuState', 1)
  }
}

export class StaticMenuStateTopic extends Topic<StaticMenuState> {
  constructor() {
    super('staticMenuState', 1)
  }
}
