import { Command, flags } from '@oclif/command'
import { prompt } from 'enquirer'
import Filenamify from 'filenamify'
import { ensureFile, readJson, writeFile } from 'fs-extra'
import { join } from 'path'

interface IUserResponses {
  parentDir: string
  title: string
  slug?: string
  summary?: string
  tags?: string[]
  images?: string[]
  draft?: boolean
}

function getFrontMatter({
  title,
  draft,
  images,
  slug,
  summary,
  tags
}: IUserResponses) {
  const frontMatter = ['---', `title: ${title}`]

  if (draft) frontMatter.push(`draft: ${draft}`)
  if (images) frontMatter.push(`images: [${images.join(', ')}]`)
  if (slug) frontMatter.push(`slug: ${slug}`)
  if (summary) frontMatter.push(`summary: ${summary}`)
  if (tags) frontMatter.push(`tags: [${tags.join(', ')}]`)

  frontMatter.push('---')

  return frontMatter.join('\n')
}

interface IUserConfig {
  blogDir: string
}

async function getConfig(cmd: Command): Promise<IUserConfig> {
  try {
    const configPath = join(cmd.config.configDir, 'config.json')
    return readJson(configPath)
  } catch (err) {
    return err
  }
}

async function createPost(info: IUserResponses, cmd: Command) {
  try {
    const { blogDir } = await getConfig(cmd)
    const outDir = join(blogDir, info.parentDir)
    const filename = `${Filenamify(info.title.toLowerCase())}.md`
    const outFile = join(outDir, filename)
    const frontMatter = getFrontMatter(info)

    await ensureFile(outFile)

    writeFile(outFile, `${frontMatter}\n\n`)

    console.log(`File written to ${outFile}`)
  } catch (err) {
    return err
  }
}

const promptUser = async () => {
  try {
    return prompt<IUserResponses>([
      {
        name: 'parentDir',
        message: 'Which (sub)folder should this post go in?',
        type: 'input',
        required: false,
        initial: new Date().getFullYear()
      },
      {
        name: 'title',
        message: 'What is the title of the new blog post?',
        type: 'input'
      },
      {
        name: 'summary',
        message: 'What is a short synopsis/summary of this new post?',
        type: 'input'
      },
      {
        name: 'tags',
        message:
          'What are some tags (in a comma-separated list) that would fit this post?',
        type: 'list'
      }
    ])
  } catch (err) {
    return err
  }
}

class BlogPoster extends Command {
  static description = 'Create a new blog post.'

  static flags = {
    // add --version flag to show CLI version
    version: flags.version({ char: 'v' }),
    help: flags.help({ char: 'h' }),

    title: flags.string({
      char: 't',
      required: false,
      description: 'What is the title of this new post?'
    })
  }

  static args = [{ name: 'title' }]

  async run() {
    const { args, flags } = this.parse(BlogPoster)

    if (flags.title || args.title) {
      await createPost(
        {
          title: flags.title || args.title,
          parentDir: '.'
        },
        this
      )
    } else {
      const res = await promptUser()
      await createPost(res, this)
    }
  }
}

export = BlogPoster
