import fs        from 'fs'
import PDFParser from 'pdf2json'
import _         from 'lodash'

export const testParsePdfData = async () => {

    const pdfFilePath = __dirname + '/izvod_3.pdf'
    const pdf = fs.readFileSync(pdfFilePath)
    return parsePdfBankReport(pdf);
}

export const parsePdfBankReport = (pdfArray: Buffer) => {

    return new Promise((resolve, reject) => {

        const pdfParser = new PDFParser()
        pdfParser.on('pdfParser_dataError', errData => reject(errData.parserError))

        let validOdobronje = null

        pdfParser.on('pdfParser_dataReady', pdfData => {

            pdfData.formImage.Pages.forEach(page => {

                page.Texts.sort((a, b) => {
                    const y = a.y - b.y
                    return (y === 0) ? a.x - b.x : y
                })

                const findTableStart = page.Texts.findIndex(f => {
                    let string = f.R?.[0]?.T || ''
                    if (!string) {
                        return false
                    }
                    string = unescape(string)
                    return /^\s*iznos\s*$/i.test(string) || /^\s*iznos u rsd\s*$/i.test(string) || /^\s*poreklo\s+naloga\s*$/i.test(string)
                })

                let findOdobrenje = null
                if (findTableStart !== -1) {
                    findOdobrenje = page.Texts.find((f, index) => {
                        if (index < findTableStart) {
                            return false
                        }
                        const string = f.R?.[0]?.T || ''
                        if (!string) {
                            return false
                        }
                        return /^\s*odobrenje\s*$/i.test(string)
                    })
                }

                if (findOdobrenje) {
                    validOdobronje = findOdobrenje
                    validOdobronje.x = _.subtract(validOdobronje.x, 1)
                }
                if (!validOdobronje) {
                    reject('not valid document')
                    return false
                }

                page.HLines = page.HLines.reduce((acc, p) => {
                    return (acc.findIndex(m => !(m.x !== p.x || m.y !== p.y || m.w !== p.w || m.l !== p.l)) !== -1) ? acc : [...acc, p]
                }, [])

                page.HLines.sort((a, b) => {
                    const y = a.y - b.y
                    return (y === 0) ? a.x - b.x : y
                })

                page.HLines = page.HLines.reduce((acc, p) => {
                    const fn = (positionIndex: number) => {
                        const index: number = acc.findIndex((m, ind) => {
                            if (ind < positionIndex) {
                                return false
                            }
                            return m.y === p.y
                        })
                        if (index === -1) {
                            return [...acc, p]
                        }
                        const lastPoint = _.round(_.add(acc[index].x, acc[index].l), 3)
                        const diff = Math.abs(_.round(_.subtract(lastPoint, p.x)))
                        if (diff < 0.002) {
                            acc[index].l = _.round(_.add(acc[index].l, p.l), 3)
                            return acc
                        }
                        return fn(index + 1)
                    }

                    return fn(0)
                }, [])

                page.Texts = page.Texts.reduce((acc, text) => {
                    const index = page.HLines.findIndex((xLine, indX: number) => {
                        if (xLine.y > text.y) {
                            return false
                        }
                        if (indX === page.HLines.length - 1) {
                            return true
                        }
                        const nextLine = page.HLines[indX + 1]
                        return text.y >= xLine.y && nextLine.y > text.y

                    }, [])

                    if (index == -1) {
                        return [...acc, text]
                    }

                    const xLine = page.HLines[index]
                    if (!xLine.text) {
                        xLine.text = []
                    }
                    xLine.text.push(text)
                    return acc
                }, [])

                page.HLines = page.HLines.map(hLine => {
                    if (!hLine.text) {
                        return hLine
                    }
                    const strings = hLine.text.reduce((acc, line) => {
                        if (!line) {
                            return acc
                        }
                        return [...acc, line]
                    }, []).map(t => {
                        return t.R?.[0]?.T || ''
                    })

                    const stringText = ' ' + unescape(strings.join(' ')) + ' '

          /** check is there a 'sifra' must be */
            // eslint-disable-next-line @typescript-eslint/prefer-regexp-exec
                    let result = stringText.match(/\s\d{3}\s/)
                    const sifra = result && result[0].trim()
          /** bank account */

                    let bankAccount = null
                    if (sifra) {
            // eslint-disable-next-line @typescript-eslint/prefer-regexp-exec
                        result = stringText.match(/\s\d{3}-\d{3,16}-\d{2,3}\s/)
                        bankAccount = result && result[0].trim()
                    }
          /** is valid amount */
                    let amount = null
                    if (sifra) {
            // eslint-disable-next-line @typescript-eslint/prefer-regexp-exec
                        result = stringText.match(/(\s[1-9]\d{0,2}(?:,\d{3})*.\d{2}\s)|(\s0.[1-9]\d\s)|(\s0.0[1-9]\s)/)
                        amount = (() => {
                            if (!result) {
                                return null
                            }
                            const amounts = result.filter(x => !!x).map(x => x.trim())
                                .sort((a, b) => +b - +a)
                            const amount = amounts[0]
                            const text = hLine.text.find(l => {
                                const string = unescape((l.R?.[0]?.T || '')).trim()
                                if (!string) {
                                    return false
                                }
                                return string === amount
                            })
                            if (!text) {
                                reject('Can\'t find text amount object')
                                return false
                            }
                            const isClaim = text.x < validOdobronje.x
                            let amn = Number(amount)
                            if (isNaN(amn)) {
                                amn = Number(amount.replace(/,/g, ''))
                            }

                            return {
                                claim: isClaim ? amn : 0,
                                owes: isClaim ? 0 : Number(amn)
                            }
                        })()
                    }

          /** is valid date, one is enough */
                    let paidDate = null
                    if (sifra) {
            // eslint-disable-next-line @typescript-eslint/prefer-regexp-exec
                        result = stringText.match(/\s\d{2}.\d{2}.\d{2,4}\s/)
                        paidDate = (() => {
                            if (!result) {
                                return null
                            }
                            const dates = result.filter(x => !!x).map(x => x.trim())
                                .map(x => {
                                    const day = +x.substr(0, 2)
                                    const month = +x.substr(3, 5)
                                    const year = +x.substr(7) % 2000 + 2000
                                    return new Date(year, month - 1, day)
                                })
                            dates.sort((a, b) => (a.getTime() - b.getTime()))
                            return dates[0]

                        })()
                    }

                    const validRecord = sifra && bankAccount && paidDate && amount && {
                        ...amount,
                        paidDate,
                        code: sifra,
                        bankAccount
                    }

                    return {
                        validRecord,
                        ...hLine,
                        stringText
                    }
                }).filter(l => !!(l as any).validRecord)

            })

            const object = {
                bankAccount: (pdfData.formImage?.Pages?.[0]?.Texts || []).filter(l => {
                    const string = unescape((l.R?.[0]?.T || '')).trim()
                    return /\d{3}-\d{3,16}-\d{2,3}/.test(string)
                })[0]?.R?.[0]?.T,
                items: _.flatten(pdfData.formImage.Pages.map(page => page.HLines)).filter(line => !!(line as any).validRecord)
                    .map(l => (l as any).validRecord)
            }
            resolve(object)
        })
        pdfParser.parseBuffer(pdfArray)
    })

}
