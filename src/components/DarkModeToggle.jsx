import { useMantineColorScheme, ActionIcon, Group } from '@mantine/core'
import { IconSun, IconMoonStars } from '@tabler/icons-react'
import { useAtom } from 'jotai'
import { colorSchemeAtom } from '../state'
import { useEffect } from 'react'

const DarkModeToggle = () => {
  const { colorScheme: mantineColorScheme, toggleColorScheme } = useMantineColorScheme()
  const [colorScheme, setColorScheme] = useAtom(colorSchemeAtom)

  // Sync Mantine's color scheme with our atom
  useEffect(() => {
    setColorScheme(mantineColorScheme)
  }, [mantineColorScheme, setColorScheme])

  const handleToggle = () => {
    toggleColorScheme()
  }

  return (
    <ActionIcon
      onClick={handleToggle}
      size="lg"
      sx={(theme) => ({
        backgroundColor:
          theme.colorScheme === 'dark'
            ? theme.colors.dark[6]
            : theme.colors.gray[0],
        color:
          theme.colorScheme === 'dark'
            ? theme.colors.yellow[4]
            : theme.colors.blue[6],
      })}
    >
      {mantineColorScheme === 'dark' ? (
        <IconSun size="1.2rem" />
      ) : (
        <IconMoonStars size="1.2rem" />
      )}
    </ActionIcon>
  )
}

export default DarkModeToggle
