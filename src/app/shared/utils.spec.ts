import { FormGroup, FormControl } from '@angular/forms'
import { SelectItem } from 'primeng/api'
import { of } from 'rxjs'

import { RefType } from './generated'
import { Utils } from './utils'

describe('util functions', () => {
  describe('dropDownSortItemsByLabel', () => {
    it('should correctly sort SelectItems by labels', () => {
      const items: SelectItem[] = [
        { label: 'a', value: 2 },
        { label: 'b', value: 1 },
        { label: undefined, value: 0 }
      ]

      expect(Utils.dropDownSortItemsByLabel(items[0], items[1])).toBeLessThan(0)
      expect(Utils.dropDownSortItemsByLabel(items[1], items[0])).toBeGreaterThan(0)
      expect(Utils.dropDownSortItemsByLabel(items[2], items[0])).toBeLessThan(0)
      expect(Utils.dropDownSortItemsByLabel(items[0], items[2])).toBeGreaterThan(0)
    })
  })

  describe('sortByLocale', () => {
    it('should return 0 when one parameter is not a string', () => {
      const result = Utils.sortByLocale(1, 'a')
      expect(result).toBe(0)
    })
    it('should return 0 when both strings are identical', () => {
      const result = Utils.sortByLocale('apple', 'apple')
      expect(result).toBe(0)
    })

    it('should correctly sort strings ignoring case', () => {
      expect(Utils.sortByLocale('apple', 'Banana')).toBeLessThan(0)
      expect(Utils.sortByLocale('Banana', 'apple')).toBeGreaterThan(0)
    })

    it('should correctly sort strings with different cases', () => {
      expect(Utils.sortByLocale('Apple', 'apple')).toBe(0)
      expect(Utils.sortByLocale('apple', 'Apple')).toBe(0)
    })

    it('should correctly sort strings with special characters', () => {
      expect(Utils.sortByLocale('café', 'Cafe')).toBeGreaterThan(0)
      expect(Utils.sortByLocale('Cafe', 'café')).toBeLessThan(0)
    })

    it('should correctly sort strings with different alphabets', () => {
      expect(Utils.sortByLocale('äpple', 'banana')).toBeLessThan(0)
      expect(Utils.sortByLocale('banana', 'äpple')).toBeGreaterThan(0)
    })

    it('should correctly sort strings with numbers', () => {
      expect(Utils.sortByLocale('apple1', 'apple2')).toBeLessThan(0)
      expect(Utils.sortByLocale('apple2', 'apple1')).toBeGreaterThan(0)
    })
  })

  describe('sortByDisplayName', () => {
    it('should return negative value when first product name comes before second alphabetically', () => {
      const itemA = { id: 'a', name: 'name', displayName: 'Admin' }
      const itemB = { id: 'b', name: 'name', displayName: 'User' }
      expect(Utils.sortByDisplayName(itemA, itemB)).toBeLessThan(0)
    })

    it('should return positive value when first product name comes after second alphabetically', () => {
      const itemA = { id: 'a', name: 'name', displayName: 'User' }
      const itemB = { id: 'b', name: 'name', displayName: 'Admin' }
      expect(Utils.sortByDisplayName(itemA, itemB)).toBeGreaterThan(0)
    })

    it('should return zero when product names are the same', () => {
      const itemA = { id: 'a', name: 'name', displayName: 'Admin' }
      const itemB = { id: 'b', name: 'name', displayName: 'Admin' }
      expect(Utils.sortByDisplayName(itemA, itemB)).toBe(0)
    })

    it('should be case-insensitive', () => {
      const itemA = { id: 'a', name: 'name', displayName: 'admin' }
      const itemB = { id: 'b', name: 'name', displayName: 'Admin' }
      expect(Utils.sortByDisplayName(itemA, itemB)).toBe(0)
    })

    it('should handle undefined names', () => {
      const itemA = { id: 'a', name: 'name', displayName: undefined }
      const itemB = { id: 'b', name: 'name', displayName: 'Admin' }
      expect(Utils.sortByDisplayName(itemA, itemB)).toBeLessThan(0)
    })

    it('should handle empty string names', () => {
      const itemA = { id: 'a', name: 'name', displayName: '' }
      const itemB = { id: 'b', name: 'name', displayName: 'Admin' }
      expect(Utils.sortByDisplayName(itemA, itemB)).toBeLessThan(0)
    })

    it('should handle both names being undefined', () => {
      const itemA = { id: 'a', name: 'name', displayName: undefined }
      const itemB = { id: 'b', name: 'name', displayName: undefined }
      expect(Utils.sortByDisplayName(itemA, itemB)).toBe(0)
    })
  })

  describe('limitText', () => {
    it('should truncate text that exceeds the specified limit', () => {
      const result = Utils.limitText('hello', 4)

      expect(result).toEqual('hell...')
    })

    it('should return the original text if it does not exceed the limit', () => {
      const result = Utils.limitText('hello', 6)

      expect(result).toEqual('hello')
    })

    it('should return an empty string for undefined input', () => {
      const str: any = undefined
      const result = Utils.limitText(str, 5)

      expect(result).toEqual('')
    })

    it('should handle zero length text', () => {
      const result = Utils.limitText(null, 4)
      expect(result).toEqual('')
    })
  })

  describe('copyToClipboard', () => {
    let writeTextSpy: jasmine.Spy

    beforeEach(() => {
      writeTextSpy = spyOn(navigator.clipboard, 'writeText')
    })

    it('should copy text to clipboard', () => {
      Utils.copyToClipboard('text')

      expect(writeTextSpy).toHaveBeenCalledWith('text')
    })
  })

  describe('forceFormValidation', () => {
    it('should mark controls as dirty and touched', () => {
      const group = new FormGroup({
        control1: new FormControl(''),
        control2: new FormControl('')
      })

      Utils.forceFormValidation(group)

      expect(group.dirty).toBeTrue()
      expect(group.touched).toBeTrue()
    })
  })

  describe('filterObject', () => {
    it('should return an empty object when input object is empty', () => {
      const result = Utils.filterObject({}, [])
      expect(result).toEqual({})
    })

    it('should return the same object when no properties are excluded', () => {
      const input = { a: 1, b: 2, c: 3 }
      const result = Utils.filterObject(input, [])
      expect(result).toEqual(input)
    })

    it('should exclude specified properties from the object', () => {
      const input = { a: 1, b: 2, c: 3 }
      const exProps = ['b']
      const expected = { a: 1, c: 3 }
      const result = Utils.filterObject(input, exProps)
      expect(result).toEqual(expected)
    })
  })

  describe('filterObjectTree', () => {
    it('should return an empty object when input object is empty', () => {
      const result = Utils.filterObjectTree({}, [], 'children')
      expect(result).toEqual({})
    })

    it('should return the same object when no properties are excluded and there are no children', () => {
      const input = { a: 1, b: 2, c: 3 }
      const result = Utils.filterObjectTree(input, [], 'children')
      expect(result).toEqual(input)
    })

    it('should exclude specified properties from the object', () => {
      const input = { a: 1, b: 2, c: 3 }
      const exProps = ['b']
      const expected = { a: 1, c: 3 }
      const result = Utils.filterObjectTree(input, exProps, 'children')
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
      const result = Utils.filterObjectTree(input, exProps, 'children')
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
      const result = Utils.filterObjectTree(input, exProps, 'children')
      expect(result).toEqual(expected)
    })
  })

  describe('prepareUrlPath', () => {
    it('should join URL and path if both are provided', () => {
      const url = 'http://example.com'
      const path = 'path'
      const result = Utils.prepareUrlPath(url, path)
      expect(result).toBe(`${url}/${path}`)
    })

    it('should return the URL if only URL is provided', () => {
      const url = 'http://example.com'
      const result = Utils.prepareUrlPath(url)
      expect(result).toBe(url)
    })

    it('should return an empty string if neither URL nor path is provided', () => {
      const result = Utils.prepareUrlPath()
      expect(result).toBe('')
    })
  })

  describe('bffProductImageUrl', () => {
    it('should return an empty string if name is not provided', () => {
      const result = Utils.bffProductImageUrl('http://example.com', undefined)
      expect(result).toBe('')
    })

    it('should construct the correct product image URL if basePath and name are provided', () => {
      const result = Utils.bffProductImageUrl('http://example.com', 'productName')
      expect(result).toBe('http://example.com/images/product/productName')
    })
  })

  describe('Utils', () => {
    describe('bffImageUrl', () => {
      it('should return an empty string if name is not provided', () => {
        const result = Utils.bffImageUrl('http://example.com', undefined, 'refTypeTest' as RefType)
        expect(result).toBe('')
      })

      it('should construct the correct image URL if basePath and name are provided', () => {
        const result = Utils.bffImageUrl('http://example.com', 'imageName', 'refTypeTest' as RefType)
        expect(result).toBe('http://example.com/images/imageName/refTypeTest')
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

        Utils.goToEndpoint(workspaceServiceMock, msgServiceMock, routerMock, productName, appId, endpointName, params)

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

        Utils.goToEndpoint(workspaceServiceMock, msgServiceMock, routerMock, productName, appId, endpointName)

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

        Utils.goToEndpoint(workspaceServiceMock, msgServiceMock, routerMock, productName, appId, endpointName)

        setTimeout(() => {
          expect(workspaceServiceMock.doesUrlExistFor).toHaveBeenCalledWith(productName, appId, endpointName)
          expect(workspaceServiceMock.getUrl).toHaveBeenCalledWith(productName, appId, endpointName, undefined)
          expect(routerMock.navigateByUrl).toHaveBeenCalledWith(expectedUrl)
          done()
        })
      })
    })
  })

  describe('getEndpointUrl', () => {
    let workspaceServiceMock: any
    let msgServiceMock: any

    beforeEach(() => {
      workspaceServiceMock = {
        doesUrlExistFor: jasmine.createSpy('doesUrlExistFor'),
        getUrl: jasmine.createSpy('getUrl')
      }
      msgServiceMock = { error: jasmine.createSpy('error') }
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

      const url$ = Utils.getEndpointUrl(workspaceServiceMock, msgServiceMock, productName, appId, endpointName, params)
      url$.subscribe((url) => {
        expect(workspaceServiceMock.doesUrlExistFor).toHaveBeenCalledWith(productName, appId, endpointName)
        expect(workspaceServiceMock.getUrl).toHaveBeenCalledWith(productName, appId, endpointName, params)
        expect(console.error).not.toHaveBeenCalled()
        expect(msgServiceMock.error).not.toHaveBeenCalled()
        expect(url).toBe(expectedUrl)
        done()
      })
    })

    it('should show an error message when the URL does not exist', (done) => {
      const productName = 'testProduct'
      const appId = 'testApp'
      const endpointName = 'testEndpoint'

      workspaceServiceMock.doesUrlExistFor.and.returnValue(of(false))

      const url$ = Utils.getEndpointUrl(workspaceServiceMock, msgServiceMock, productName, appId, endpointName)
      url$.subscribe()

      setTimeout(() => {
        expect(workspaceServiceMock.doesUrlExistFor).toHaveBeenCalledWith(productName, appId, endpointName)
        expect(workspaceServiceMock.getUrl).not.toHaveBeenCalled()
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

      const url$ = Utils.getEndpointUrl(workspaceServiceMock, msgServiceMock, productName, appId, endpointName)
      url$.subscribe((url) => {
        expect(workspaceServiceMock.doesUrlExistFor).toHaveBeenCalledWith(productName, appId, endpointName)
        expect(workspaceServiceMock.getUrl).toHaveBeenCalledWith(productName, appId, endpointName, undefined)
        expect(url).toBe(expectedUrl)
        done()
      })
    })
  })
})
