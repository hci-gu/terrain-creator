import { Paper, Flex, Box } from '@mantine/core'

export const ContentCell = ({ children, flexBasis = '50%', ...props }) => (
  <Paper
    flex={`1 1 ${flexBasis}`}
    miw="0"
    w="100%"
    p="md"
    shadow="xl"
    radius="md"
    withBorder
    {...props}
  >
    {children}
  </Paper>
)

export const ContentLayout = ({ sidebar, main }) => (
  <Flex
    justify="flex-start"
    align="flex-start"
    direction="row"
    wrap="nowrap"
    // gap="xs"
    h="100%"
    miw="0"
  >
    <Box h="100%" w="30vw" miw="300" maw="500" flex="0 0 auto">
      {sidebar}
    </Box>

    <Box
      h="100%"
      miw="0"
      flex="auto"
      // style={{ overflowX: 'auto' }}
    >
      {main}
    </Box>
  </Flex>
)
