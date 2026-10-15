import { test as setup } from '@playwright/test'
import { assertLocalStack } from './helpers'

setup('running against the local stack', async () => {
  assertLocalStack()
})
