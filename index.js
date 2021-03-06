let djs

try {
    djs = require('discord.js')
} catch {
    throw new Error('Paginator: ' + 'Please install discord.js package manually')
}

const defaultOpts = {
	pages: [],
	remove: '🗑️',
	reset: '🔁',
	reaction: ['⬅️', '➡️'],
	removeReaction: true,
	removeAtEnd: true,
	pageCount: 'Page {current}/{total}',
	timeout: 60000,
	filter: (reaction, user) => true
}

function none() {}

class Paginator {
	constructor(opts = defaultOpts) {
		Object.assign(this, defaultOpts)
		Object.assign(this, opts)
	}

	async spawn(channel) {
		const opts = {
			remove: this.remove,
			reset: this.reset,
			reaction: this.reaction,
			removeReaction: this.removeReaction,
			removeAtEnd: this.removeAtEnd,
			pageCount: this.pageCount,
			timeout: this.timeout,
			filter: this.filter
		}
		const pages = [...this.pages]
		let page = 0

		if (!pages.length) throw new Error('Paginator: ' + 'Empty pages')

		if (typeof opts.pageCount == 'string') {
			for (let i = 0; i < pages.length; i++) {
				if (pages[i] instanceof djs.MessageEmbed) pages[i].setFooter(opts.pageCount.replace(/\{current\}/g, i + 1).replace(/\{total\}/g, pages.length))
				else if (typeof pages[i] == 'string') pages[i] = `${opts.pageCount.replace(/\{current\}/g, i + 1).replace(/\{total\}/g, pages.length)}\n${pages[i]}`
			}
		}

		let message = await channel.send(pages[page])

		if (!Array.isArray(opts.reaction) || opts.reaction.length < 2) throw new Error('Paginator: ' + 'Must be two reactions given in \'reaction\' options')

		if (typeof opts.filter != 'function') throw new Error('Paginator: ' + 'Expecting a function in \'filter\' options')

		if (opts.timeout < 1000 || opts.timeout > 259200000) throw new Error('Paginator: ' + 'Spawner timeout must be between 1 second and 3 days')

		const reactions = {}

		if (typeof opts.reset == 'string' && pages.length > 1) {
			reactions.reset = await message.react(opts.reset).catch(none)
			if (!reactions.reset) return
		}

		if (pages.length > 1) {
			reactions.left = await message.react(opts.reaction[0]).catch(none)

			if (!reactions.left) return

			reactions.right = await message.react(opts.reaction[1]).catch(none)
		}


		if (typeof opts.remove == 'string') {
			reactions.remove = await message.react(opts.remove).catch(none)
			if (!reactions.remove) return
		}

		async function filter(reaction, user) {
			const bool = [false, await opts.filter(reaction, user)]

			if (reactions.reset) bool[0] = reaction.emoji.toString() == reactions.reset.emoji.toString()

			if (!bool[0] && reactions.remove) bool[0] = reaction.emoji.toString() == reactions.remove.emoji.toString()

			if (!bool[0]) bool[0] = reaction.emoji.toString() == reactions.left.emoji.toString() || reaction.emoji.toString() == reactions.right.emoji.toString()

			return bool.every(condition => condition)
		}

		const collector = message.createReactionCollector(filter, { time: opts.timeout })

		collector.on('collect', async (reaction, user) => {
			if (reactions.reset && reaction.emoji.toString() == reactions.reset.emoji.toString()) {
				page = 0

				await message.edit(pages[page])
			} else if (reactions.remove && reaction.emoji.toString() == reactions.remove.emoji.toString()) {
				collector.stop('123M0V3')

				return
			} else if (reaction.emoji.toString() == reactions.left.emoji.toString()) {
				if (pages[page - 1]) {
					page--

					await message.edit(pages[page])
				}
			} else if (reaction.emoji.toString() == reactions.right.emoji.toString()) {
				if (pages[page + 1]) {
					page++

					await message.edit(pages[page])
				}
			}

			reaction.users.remove(user.id).catch(none)
		})

		collector.on('end', async (collected, reason) => {
			if (opts.removeAtEnd && reason != '123M0V3') {
				for (const reaction of Object.values(reactions)) {
					await reaction.remove().catch(none)
				}
			}

			if (reason == '123M0V3') await message.delete()
		})
	}
}

module.exports = Paginator