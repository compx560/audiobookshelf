const Sequelize = require('sequelize')
const Database = require('../../Database')
const Logger = require('../../Logger')

module.exports = {
  getOrder(sortBy, sortDesc) {
    const dir = sortDesc ? 'DESC' : 'ASC'
    if (sortBy === 'addedAt') {
      return [[Sequelize.literal('libraryItem.createdAt'), dir]]
    } else if (sortBy === 'size') {
      return [[Sequelize.literal('libraryItem.size'), dir]]
    } else if (sortBy === 'birthtimeMs') {
      return [[Sequelize.literal('libraryItem.birthtime'), dir]]
    } else if (sortBy === 'mtimeMs') {
      return [[Sequelize.literal('libraryItem.mtime'), dir]]
    } else if (sortBy === 'media.duration') {
      return [['duration', dir]]
    } else if (sortBy === 'media.metadata.publishedYear') {
      return [['publishedYear', dir]]
    } else if (sortBy === 'media.metadata.authorNameLF') {
      return [] // TODO: Handle author filter
    } else if (sortBy === 'media.metadata.authorName') {
      return [] // TODO: Handle author filter
    } else if (sortBy === 'media.metadata.title') {
      if (global.ServerSettings.sortingIgnorePrefix) {
        return [['titleIgnorePrefix', dir]]
      } else {
        return [['title', dir]]
      }
    }
    return []
  },

  async getLibraryItemsWithNoSeries(libraryId, sortBy, sortDesc, limit, offset) {
    const { rows: books, count } = await Database.models.book.findAndCountAll({
      where: {
        '$series.id$': null
      },
      distinct: true,
      include: [
        {
          model: Database.models.libraryItem,
          required: true,
          where: {
            libraryId
          }
        },
        {
          model: Database.models.series,
          attributes: ['id', 'name'],
          through: {
            attributes: ['sequence']
          },
        },
        {
          model: Database.models.bookAuthor,
          attributes: ['authorId'],
          include: {
            model: Database.models.author,
            attributes: ['id', 'name']
          },
          separate: true
        }
      ],
      order: this.getOrder(sortBy, sortDesc),
      subQuery: false,
      limit,
      offset
    })

    const libraryItems = books.map((bookExpanded) => {
      const libraryItem = bookExpanded.libraryItem.toJSON()
      const book = bookExpanded.toJSON()
      delete book.libraryItem

      book.authors = []
      if (book.bookAuthors?.length) {
        book.bookAuthors.forEach((ba) => {
          if (ba.author) {
            book.authors.push(ba.author)
          }
        })
      }
      delete book.bookAuthors

      libraryItem.media = book

      return libraryItem
    })
    Logger.debug('Found', libraryItems.length, 'library items', 'total=', count)
    return {
      libraryItems,
      count
    }
  }
}