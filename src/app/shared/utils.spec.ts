import { FormGroup, FormControl } from '@angular/forms'
import { SelectItem } from 'primeng/api'

import {
  limitText,
  setFetchUrls,
  copyToClipboard,
  forceFormValidation,
  dropDownGetLabelByValue,
  prepareUrl,
  prepareUrlPath,
  bffImageUrl,
  bffProductImageUrl,
  filterObject,
  filterObjectTree,
  sortByLocale,
  dropDownSortItemsByLabel,
  goToEndpoint
} from './utils'
import { RefType } from './generated'
import { of } from 'rxjs'

describe('util functions', () => {
  describe('dropDownSortItemsByLabel', () => {
    it('should correctly sort SelectItems by labels', () => {
      const items: SelectItem[] = [
        { label: 'a', value: 2 },
        { label: 'b', value: 1 },
        { label: undefined, value: 0 }
      ]

      expect(dropDownSortItemsByLabel(items[0], items[1])).toBeLessThan(0)
      expect(dropDownSortItemsByLabel(items[1], items[0])).toBeGreaterThan(0)
      expect(dropDownSortItemsByLabel(items[2], items[0])).toBeLessThan(0)
      expect(dropDownSortItemsByLabel(items[0], items[2])).toBeGreaterThan(0)
    })
  })

  describe('sortByLocale', () => {
    it('should return 0 when both strings are identical', () => {
      const result = sortByLocale('apple', 'apple')
      expect(result).toBe(0)
    })

    it('should correctly sort strings ignoring case', () => {
      expect(sortByLocale('apple', 'Banana')).toBeLessThan(0)
      expect(sortByLocale('Banana', 'apple')).toBeGreaterThan(0)
    })

    it('should correctly sort strings with different cases', () => {
      expect(sortByLocale('Apple', 'apple')).toBe(0)
      expect(sortByLocale('apple', 'Apple')).toBe(0)
    })

    it('should correctly sort strings with special characters', () => {
      expect(sortByLocale('café', 'Cafe')).toBeGreaterThan(0)
      expect(sortByLocale('Cafe', 'café')).toBeLessThan(0)
    })

    it('should correctly sort strings with different alphabets', () => {
      expect(sortByLocale('äpple', 'banana')).toBeLessThan(0)
      expect(sortByLocale('banana', 'äpple')).toBeGreaterThan(0)
    })

    it('should correctly sort strings with numbers', () => {
      expect(sortByLocale('apple1', 'apple2')).toBeLessThan(0)
      expect(sortByLocale('apple2', 'apple1')).toBeGreaterThan(0)
    })
  })

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

    it('should handle zero length text', () => {
      const result = limitText(null, 4)
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

  describe('filterObject', () => {
    it('should return an empty object when input object is empty', () => {
      const result = filterObject({}, [])
      expect(result).toEqual({})
    })

    it('should return the same object when no properties are excluded', () => {
      const input = { a: 1, b: 2, c: 3 }
      const result = filterObject(input, [])
      expect(result).toEqual(input)
    })

    it('should exclude specified properties from the object', () => {
      const input = { a: 1, b: 2, c: 3 }
      const exProps = ['b']
      const expected = { a: 1, c: 3 }
      const result = filterObject(input, exProps)
      expect(result).toEqual(expected)
    })
  })

  describe('filterObjectTree', () => {
    it('should return an empty object when input object is empty', () => {
      const result = filterObjectTree({}, [], 'children')
      expect(result).toEqual({})
    })

    it('should return the same object when no properties are excluded and there are no children', () => {
      const input = { a: 1, b: 2, c: 3 }
      const result = filterObjectTree(input, [], 'children')
      expect(result).toEqual(input)
    })

    it('should exclude specified properties from the object', () => {
      const input = { a: 1, b: 2, c: 3 }
      const exProps = ['b']
      const expected = { a: 1, c: 3 }
      const result = filterObjectTree(input, exProps, 'children')
      expect(result).toEqual(expected)
    })

    it('should exclude specified properties from nested objects', () => {
      const input = {
        a: 1,
        b: 2,
        c: 3,
        children: [
          { a: 1, b: 2 },
          { a: 2, c: 3 }
        ]
      }
      const exProps = ['b']
      const expected = { a: 1, c: 3, children: [{ a: 1 }, { a: 2, c: 3 }] }
      const result = filterObjectTree(input, exProps, 'children')
      expect(result).toEqual(expected)
    })

    it('should handle multiple levels of nesting', () => {
      const input = {
        a: 1,
        b: 2,
        c: 3,
        children: [
          { a: 1, b: 2, children: [{ a: 1, b: 2 }] },
          { a: 2, c: 3, children: [{ a: 2, c: 3 }] }
        ]
      }
      const exProps = ['b']
      const expected = {
        a: 1,
        c: 3,
        children: [
          { a: 1, children: [{ a: 1 }] },
          { a: 2, c: 3, children: [{ a: 2, c: 3 }] }
        ]
      }
      const result = filterObjectTree(input, exProps, 'children')
      expect(result).toEqual(expected)
    })
  })

  describe('prepareUrl', () => {
    it('should return the URL unchanged if it starts with http', () => {
      const url = 'http://example.com/endpoint'
      const result = prepareUrl(url)

      expect(result).toBe(url)
    })

    it('should return the URL unchanged if it starts with https', () => {
      const url = 'https://example.com/endpoint'
      const result = prepareUrl(url)

      expect(result).toBe(url)
    })

    it('should return undefined if the URL is undefined', () => {
      const result = prepareUrl(undefined)

      expect(result).toBeUndefined()
    })

    it('should return URL if the URL is undefined', () => {
      const result = prepareUrl(undefined)

      expect(result).toBeUndefined()
    })

    it('should return the URL unchanged if it does not start with http', () => {
      const url = 'example.com/endpoint'
      const result = prepareUrl(url)
      expect(result).toBe('bff/example.com/endpoint')
    })
  })

  describe('prepareUrlPath', () => {
    it('should join URL and path if both are provided', () => {
      const url = 'http://example.com'
      const path = 'path'
      const result = prepareUrlPath(url, path)
      expect(result).toBe(`${url}/${path}`)
    })

    it('should return the URL if only URL is provided', () => {
      const url = 'http://example.com'
      const result = prepareUrlPath(url)
      expect(result).toBe(url)
    })

    it('should return an empty string if neither URL nor path is provided', () => {
      const result = prepareUrlPath()
      expect(result).toBe('')
    })
  })

  describe('bffImageUrl', () => {
    it('should return an empty string if name is not provided', () => {
      const result = bffImageUrl('http://example.com', undefined, 'refTypeTest' as RefType)
      expect(result).toBe('')
    })

    it('should construct the correct image URL if basePath and name are provided', () => {
      const result = bffImageUrl('http://example.com', 'imageName', 'refTypeTest' as RefType)
      expect(result).toBe('http://example.com/images/imageName/refTypeTest')
    })
  })

  describe('bffProductImageUrl', () => {
    it('should return an empty string if name is not provided', () => {
      const result = bffProductImageUrl('http://example.com', undefined)
      expect(result).toBe('')
    })

    it('should construct the correct product image URL if basePath and name are provided', () => {
      const result = bffProductImageUrl('http://example.com', 'productName')
      expect(result).toBe('http://example.com/images/product/productName')
    })
  })

  describe('goToEndpoint', () => {
    let workspaceServiceMock: any
    let msgServiceMock: any
    let routerMock: any

    beforeEach(() => {
      workspaceServiceMock = {
        doesUrlExistFor: jasmine.createSpy('doesUrlExistFor'),
        getUrl: jasmine.createSpy('getUrl')
      }

      msgServiceMock = {
        error: jasmine.createSpy('error')
      }

      routerMock = {
        navigateByUrl: jasmine.createSpy('navigateByUrl')
      }

      spyOn(console, 'error')
    })

    it('should navigate to the URL when it exists', (done) => {
      const productName = 'testProduct'
      const appId = 'testApp'
      const endpointName = 'testEndpoint'
      const params = { param1: 'value1' }
      const expectedUrl = '/test/url'

      workspaceServiceMock.doesUrlExistFor.and.returnValue(of(true))
      workspaceServiceMock.getUrl.and.returnValue(of(expectedUrl))

      goToEndpoint(workspaceServiceMock, msgServiceMock, routerMock, productName, appId, endpointName, params)

      setTimeout(() => {
        expect(workspaceServiceMock.doesUrlExistFor).toHaveBeenCalledWith(productName, appId, endpointName)
        expect(workspaceServiceMock.getUrl).toHaveBeenCalledWith(productName, appId, endpointName, params)
        expect(routerMock.navigateByUrl).toHaveBeenCalledWith(expectedUrl)
        expect(console.error).not.toHaveBeenCalled()
        expect(msgServiceMock.error).not.toHaveBeenCalled()
        done()
      })
    })

    it('should show an error message when the URL does not exist', (done) => {
      const productName = 'testProduct'
      const appId = 'testApp'
      const endpointName = 'testEndpoint'

      workspaceServiceMock.doesUrlExistFor.and.returnValue(of(false))

      goToEndpoint(workspaceServiceMock, msgServiceMock, routerMock, productName, appId, endpointName)

      setTimeout(() => {
        expect(workspaceServiceMock.doesUrlExistFor).toHaveBeenCalledWith(productName, appId, endpointName)
        expect(workspaceServiceMock.getUrl).not.toHaveBeenCalled()
        expect(routerMock.navigateByUrl).not.toHaveBeenCalled()
        expect(console.error).toHaveBeenCalledWith(
          'Routing not possible for product: testProduct  app: testApp  endpoint: testEndpoint'
        )
        expect(msgServiceMock.error).toHaveBeenCalledWith({
          summaryKey: 'EXCEPTIONS.ENDPOINT.NOT_EXIST',
          detailKey: 'EXCEPTIONS.CONTACT_ADMIN'
        })
        done()
      })
    })

    it('should handle the case when params are not provided', (done) => {
      const productName = 'testProduct'
      const appId = 'testApp'
      const endpointName = 'testEndpoint'
      const expectedUrl = '/test/url'

      workspaceServiceMock.doesUrlExistFor.and.returnValue(of(true))
      workspaceServiceMock.getUrl.and.returnValue(of(expectedUrl))

      goToEndpoint(workspaceServiceMock, msgServiceMock, routerMock, productName, appId, endpointName)

      setTimeout(() => {
        expect(workspaceServiceMock.doesUrlExistFor).toHaveBeenCalledWith(productName, appId, endpointName)
        expect(workspaceServiceMock.getUrl).toHaveBeenCalledWith(productName, appId, endpointName, undefined)
        expect(routerMock.navigateByUrl).toHaveBeenCalledWith(expectedUrl)
        done()
      })
    })
  })
})
