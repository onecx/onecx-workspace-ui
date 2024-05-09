import { FormGroup, FormControl } from '@angular/forms'
import { SelectItem } from 'primeng/api'

import {
  limitText,
  setFetchUrls,
  copyToClipboard,
  forceFormValidation,
  dropDownSortItemsByLabel,
  dropDownGetLabelByValue,
  sortByLocale
} from './utils'

describe('util functions', () => {
  describe('limitText', () => {
    it('should truncate text that exceeds the specified limit', () => {
      const result = limitText('hello', 4)

      expect(result).toEqual('hell...')
    })

    it('should return the original text if it does not exceed the limit', () => {
      const result = limitText('hello', 6)

      expect(result).toEqual('hello')
    })

    it('should return an empty string for undefined input', () => {
      const str: any = undefined
      const result = limitText(str, 5)

      expect(result).toEqual('')
    })
  })

  describe('setFetchUrls', () => {
    it('should prepend apiPrefix to a relative URL', () => {
      const result = setFetchUrls('ahm-api', '/am')

      expect(result).toEqual('ahm-api/am')
    })

    it('should return the original URL if it is absolute', () => {
      const result = setFetchUrls('ahm-api', 'http://am')

      expect(result).toEqual('http://am')
    })
  })

  describe('copyToClipboard', () => {
    let writeTextSpy: jasmine.Spy

    beforeEach(() => {
      writeTextSpy = spyOn(navigator.clipboard, 'writeText')
    })

    it('should copy text to clipboard', () => {
      copyToClipboard('text')

      expect(writeTextSpy).toHaveBeenCalledWith('text')
    })
  })

  describe('forceFormValidation', () => {
    it('should mark controls as dirty and touched', () => {
      const group = new FormGroup({
        control1: new FormControl(''),
        control2: new FormControl('')
      })

      forceFormValidation(group)

      expect(group.dirty).toBeTrue()
      expect(group.touched).toBeTrue()
    })
  })

  describe('dropDownSortItemsByLabel', () => {
    it('should correctly sort items by label', () => {
      const items: SelectItem[] = [
        { label: 'label2', value: 2 },
        { label: 'label1', value: 1 }
      ]

      const sortedItems = items.sort(dropDownSortItemsByLabel)

      expect(sortedItems[0].label).toEqual('label1')
    })
  })

  describe('dropDownGetLabelByValue', () => {
    it('should return the label corresponding to the value', () => {
      const items: SelectItem[] = [
        { label: 'label2', value: 2 },
        { label: 'label1', value: 1 }
      ]

      const result = dropDownGetLabelByValue(items, '1')

      expect(result).toEqual('label1')
    })
  })

  describe('sortByLocale', () => {
    it('should sort strings based on locale', () => {
      const strings: string[] = ['str2', 'str1']

      const sortedStrings = strings.sort(sortByLocale)

      expect(sortedStrings[0]).toEqual('str1')
    })
  })
})
