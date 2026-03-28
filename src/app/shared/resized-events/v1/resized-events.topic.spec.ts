import { TopicPublisher, Topic } from '@onecx/accelerator'
import { ResizedEventType } from './resized-event-type'
import { ResizedEventsPublisher, ResizedEventsTopic } from './resized-events.topic'
import { SlotResizedEvent } from './slots-resized-type'
import { SlotGroupResizedEvent } from './slot-groups-resized-type'
import { RequestedEventsChangedEvent } from './resized-update-requested-type'

const slotResizedEvent: SlotResizedEvent = {
  type: ResizedEventType.SLOT_RESIZED,
  payload: { slotName: 'slot1', slotDetails: { width: 100, height: 200 } }
}

const slotGroupResizedEvent: SlotGroupResizedEvent = {
  type: ResizedEventType.SLOT_GROUP_RESIZED,
  payload: { slotGroupName: 'group1', slotGroupDetails: { width: 300, height: 400 } }
}

const requestedEventsChangedEvent: RequestedEventsChangedEvent = {
  type: ResizedEventType.REQUESTED_EVENTS_CHANGED,
  payload: { type: ResizedEventType.SLOT_RESIZED, name: 'slot1' }
}

describe('ResizedEventsPublisher', () => {
  let publisher: ResizedEventsPublisher
  let superPublishSpy: jasmine.Spy

  beforeEach(() => {
    window['@onecx/integration-interface'] = { resizedEvents: {} }
    publisher = new ResizedEventsPublisher()
    superPublishSpy = spyOn(TopicPublisher.prototype, 'publish').and.returnValue(Promise.resolve())
  })

  describe('publish()', () => {
    it('should call super.publish for REQUESTED_EVENTS_CHANGED event', async () => {
      await publisher.publish(requestedEventsChangedEvent)

      expect(superPublishSpy).toHaveBeenCalledOnceWith(requestedEventsChangedEvent)
    })

    it('should call super.publish for SLOT_RESIZED event when slot is registered', async () => {
      window['@onecx/integration-interface']['resizedEvents']!['slot_resized'] = ['slot1', 'other']

      await publisher.publish(slotResizedEvent)

      expect(superPublishSpy).toHaveBeenCalledOnceWith(slotResizedEvent)
    })

    it('should not call super.publish for SLOT_RESIZED event when slot is not registered', async () => {
      window['@onecx/integration-interface']['resizedEvents']!['slot_resized'] = ['other-slot']

      await publisher.publish(slotResizedEvent)

      expect(superPublishSpy).not.toHaveBeenCalled()
    })

    it('should not call super.publish for SLOT_RESIZED event when resizedEvents registry is empty', async () => {
      await publisher.publish(slotResizedEvent)

      expect(superPublishSpy).not.toHaveBeenCalled()
    })

    it('should call super.publish for SLOT_GROUP_RESIZED event when slot group is registered', async () => {
      window['@onecx/integration-interface']['resizedEvents']!['slot_group_resized'] = ['group1']

      await publisher.publish(slotGroupResizedEvent)

      expect(superPublishSpy).toHaveBeenCalledOnceWith(slotGroupResizedEvent)
    })

    it('should not call super.publish for SLOT_GROUP_RESIZED event when slot group is not registered', async () => {
      window['@onecx/integration-interface']['resizedEvents']!['slot_group_resized'] = ['other-group']

      await publisher.publish(slotGroupResizedEvent)

      expect(superPublishSpy).not.toHaveBeenCalled()
    })
  })
})

describe('ResizedEventsTopic', () => {
  let topic: ResizedEventsTopic
  let superPublishSpy: jasmine.Spy

  beforeEach(() => {
    window['@onecx/integration-interface'] = {} as any
    topic = new ResizedEventsTopic()
    superPublishSpy = spyOn(Topic.prototype, 'publish').and.returnValue(Promise.resolve())
  })

  describe('constructor', () => {
    it('should initialize window integration interface if not set', () => {
      delete (window as any)['@onecx/integration-interface']

      new ResizedEventsTopic()

      expect(window['@onecx/integration-interface']).toBeDefined()
      expect(window['@onecx/integration-interface']['resizedEvents']).toBeDefined()
    })

    it('should initialize resizedEvents if window integration interface exists but resizedEvents is not set', () => {
      window['@onecx/integration-interface'] = {} as any

      new ResizedEventsTopic()

      expect(window['@onecx/integration-interface']['resizedEvents']).toBeDefined()
    })

    it('should not override existing resizedEvents registry', () => {
      const existing = { slot_resized: ['existing-slot'] }
      window['@onecx/integration-interface'] = { resizedEvents: existing } as any

      new ResizedEventsTopic()

      expect(window['@onecx/integration-interface']['resizedEvents']).toBe(existing)
    })
  })

  describe('requestEvent()', () => {
    it('should add entity name to window registry for SLOT_RESIZED', () => {
      ResizedEventsTopic.requestEvent(ResizedEventType.SLOT_RESIZED, 'my-slot')

      expect(window['@onecx/integration-interface']['resizedEvents']!['slot_resized']).toContain('my-slot')
    })

    it('should add entity name to window registry for SLOT_GROUP_RESIZED', () => {
      ResizedEventsTopic.requestEvent(ResizedEventType.SLOT_GROUP_RESIZED, 'my-group')

      expect(window['@onecx/integration-interface']['resizedEvents']!['slot_group_resized']).toContain('my-group')
    })

    it('should append to existing registry entries', () => {
      window['@onecx/integration-interface']['resizedEvents']!['slot_resized'] = ['existing-slot']

      ResizedEventsTopic.requestEvent(ResizedEventType.SLOT_RESIZED, 'new-slot')

      expect(window['@onecx/integration-interface']['resizedEvents']!['slot_resized']).toEqual([
        'existing-slot',
        'new-slot'
      ])
    })

    it('should publish a REQUESTED_EVENTS_CHANGED event via ResizedEventsPublisher', () => {
      spyOn(ResizedEventsPublisher.prototype, 'publish').and.returnValue(Promise.resolve())

      ResizedEventsTopic.requestEvent(ResizedEventType.SLOT_RESIZED, 'my-slot')

      expect(ResizedEventsPublisher.prototype.publish).toHaveBeenCalledOnceWith({
        type: ResizedEventType.REQUESTED_EVENTS_CHANGED,
        payload: { type: ResizedEventType.SLOT_RESIZED, name: 'my-slot' }
      })
    })

    it('should initialize window properties if not set before calling requestEvent', () => {
      delete (window as any)['@onecx/integration-interface']

      ResizedEventsTopic.requestEvent(ResizedEventType.SLOT_RESIZED, 'my-slot')

      expect(window['@onecx/integration-interface']['resizedEvents']!['slot_resized']).toContain('my-slot')
    })
  })

  describe('publish()', () => {
    it('should call super.publish for REQUESTED_EVENTS_CHANGED event', async () => {
      await topic.publish(requestedEventsChangedEvent)

      expect(superPublishSpy).toHaveBeenCalledOnceWith(requestedEventsChangedEvent)
    })

    it('should call super.publish for SLOT_RESIZED event when slot is registered', async () => {
      window['@onecx/integration-interface']['resizedEvents']!['slot_resized'] = ['slot1']

      await topic.publish(slotResizedEvent)

      expect(superPublishSpy).toHaveBeenCalledOnceWith(slotResizedEvent)
    })

    it('should not call super.publish for SLOT_RESIZED event when slot is not registered', async () => {
      window['@onecx/integration-interface']['resizedEvents']!['slot_resized'] = ['other-slot']

      await topic.publish(slotResizedEvent)

      expect(superPublishSpy).not.toHaveBeenCalled()
    })

    it('should not call super.publish for SLOT_RESIZED event when resizedEvents registry is empty', async () => {
      await topic.publish(slotResizedEvent)

      expect(superPublishSpy).not.toHaveBeenCalled()
    })

    it('should call super.publish for SLOT_GROUP_RESIZED event when slot group is registered', async () => {
      window['@onecx/integration-interface']['resizedEvents']!['slot_group_resized'] = ['group1']

      await topic.publish(slotGroupResizedEvent)

      expect(superPublishSpy).toHaveBeenCalledOnceWith(slotGroupResizedEvent)
    })

    it('should not call super.publish for SLOT_GROUP_RESIZED event when slot group is not registered', async () => {
      window['@onecx/integration-interface']['resizedEvents']!['slot_group_resized'] = ['other-group']

      await topic.publish(slotGroupResizedEvent)

      expect(superPublishSpy).not.toHaveBeenCalled()
    })
  })
})
