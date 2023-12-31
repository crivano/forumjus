const mysql = require("mysql2/promise");

const pool = mysql.createPool({
    connectionLimit: 10,
    host: process.env.MYSQL_HOST,
    port: process.env.MYSQL_PORT,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    debug: false
});

export default {

    async getConnection() {
        return await pool.getConnection();
    },

    async register(forumId, data) {
        console.log(data)
        const conn = await this.getConnection()
        conn.beginTransaction()
        try {
            const resultEmail = await conn.query('SELECT * FROM attendee WHERE attendee_email = ?;', [data.attendeeEmail])
            if (resultEmail[0].length)  throw `E-mail ${data.attendeeEmail} já consta na base de inscritos`

            const resultDocument = await conn.query('SELECT * FROM attendee WHERE attendee_document = ?;', [data.attendeeDocument])
            if (resultDocument[0].length)  throw `CPF ${data.attendeeDocument} já consta na base de inscritos`

            const result = await conn.query('INSERT INTO attendee(forum_id,occupation_id,attendee_name,attendee_email,attendee_document,attendee_affiliation) VALUES (?,?,?,?,?,?);',
                [forumId, data.attendeeOccupationId, data.attendeeName, data.attendeeEmail, data.attendeeDocument, data.attendeeAffiliation])
            const attendeeId = result[0].insertId
            data.statement.forEach(async (statement) => {
                const result = await conn.query('INSERT INTO statement(forum_id,attendee_id,committee_id,statement_text,statement_justification) VALUES (?,?,?,?,?);',
                    [forumId, attendeeId, parseInt(statement.committeeId), statement.text, statement.justification])
            })
            conn.commit()
            return attendeeId
        } catch (e) {
            conn.rollback()
            throw e
        } finally {
            conn.release()
        }
    },

    async createElection(electionName, administratorEmail, voters, candidates) {
        const conn = await this.getConnection()
        conn.beginTransaction()
        try {
            const result = await conn.query('INSERT INTO election(election_name,election_administrator_email) VALUES (?,?);', [electionName, administratorEmail])
            const electionId = result[0].insertId

            voters.forEach(async voter => {
                const result = await conn.query('INSERT INTO voter(election_id,voter_name,voter_email) VALUES (?,?,?);', [electionId, voter.name, voter.email])
            });

            candidates.forEach(async cadidate => {
                const result = await conn.query('INSERT INTO candidate(election_id,candidate_name,candidate_votes) VALUES (?,?,?);', [electionId, cadidate.name, 0])
            });

            conn.commit()
            return electionId
        } catch (e) {
            conn.rollback()
            throw e
        } finally {
            conn.release()
        }
    },

    async loadElection(electionId) {
        const conn = await this.getConnection()
        const result = await conn.query('SELECT * FROM election WHERE election_id = ?;', [electionId])

        const electionName = result[0][0].election_name
        const administratorEmail = result[0][0].election_administrator_email
        const electionStart = result[0][0].election_start
        const electionEnd = result[0][0].election_end

        const resultVoters = await conn.query('SELECT * FROM voter WHERE election_id = ? order by voter_name;', [electionId])
        const voters = []
        resultVoters[0].forEach(r => {
            voters.push({ id: r.voter_id, name: r.voter_name, email: r.voter_email, voteDatetime: r.voter_vote_datetime, voteIp: r.voter_vote_ip })
        })

        const [resultCandidates] = await conn.query(`SELECT * FROM candidate WHERE election_id = ? ORDER BY ${electionEnd ? 'candidate_votes desc' : "SUBSTRING(candidate_name, 1, 1) = '[', candidate_name"};`, [electionId])
        const candidates = []
        resultCandidates.forEach(r => {
            candidates.push({ id: r.candidate_id, name: r.candidate_name, votes: (electionEnd ? r.candidate_votes : null) })
        })

        conn.release()
        return { id: electionId, name: electionName, administratorEmail, start: electionStart, end: electionEnd, voters, candidates }
    },

    async startElection(electionId) {
        const conn = await this.getConnection()
        const result = await conn.query('UPDATE election SET election_start = now() WHERE election_start is null and election_id = ?;', [electionId])
        conn.release()
    },

    async endElection(electionId) {
        const conn = await this.getConnection()
        const result = await conn.query('UPDATE election SET election_end = now() WHERE election_end is null and election_id = ?;', [electionId])
        conn.release()
    },

    async vote(electionId, voterId, candidateId, voterIp) {
        const conn = await this.getConnection()
        conn.beginTransaction()

        try {
            const resultElection = await conn.query('SELECT * FROM election WHERE election_id = ?;', [electionId])
            const electionName = resultElection[0][0].election_name
            const electionStart = resultElection[0][0].election_start
            const electionEnd = resultElection[0][0].election_end

            if (!electionStart) throw `Eleição ${electionName} ainda não está recebendo votos`
            if (electionEnd) throw `Eleição ${electionName} já está encerrada`

            const [resultVoter] = await conn.query('SELECT * FROM voter WHERE election_id = ? and voter_id = ?;', [electionId, voterId])
            if (resultVoter.length !== 1) throw `Usuário ${voterId} não encontrado`

            const voteDatetime = resultVoter[0].voter_vote_datetime
            if (voteDatetime) throw `Usuário ${voterId} não pode votar duas vezes`

            const result2 = await conn.query('UPDATE voter SET voter_vote_datetime = now(), voter_vote_ip = ? WHERE voter_vote_datetime is null and election_id = ? and voter_id = ?;', [voterIp, electionId, voterId])
            const result3 = await conn.query('UPDATE candidate SET candidate_votes = candidate_votes + 1 WHERE election_id = ? and candidate_id = ?;', [electionId, candidateId])
            conn.commit()
        } catch (e) {
            conn.rollback()
            throw e
        } finally {
            conn.release()
        }
    },

    async addEmail(electionId, voterId, email) {
        const conn = await this.getConnection()
        conn.beginTransaction()

        try {
            const resultElection = await conn.query('SELECT * FROM election WHERE election_id = ?;', [electionId])
            const electionName = resultElection[0][0].election_name
            const electionStart = resultElection[0][0].election_start
            const electionEnd = resultElection[0][0].election_end

            if (electionEnd) throw `Eleição ${electionName} já está encerrada`

            const resultVoter = await conn.query('SELECT * FROM voter WHERE election_id = ? and voter_id = ?;', [electionId, voterId])
            const voteDatetime = resultVoter[0][0].voter_vote_datetime

            if (voteDatetime) throw `Usuário ${voterId} já votou.`

            // TESTAR SE ELEICAO ESTÁ STARTED E NÃO ESTÁ ENDED

            const result2 = await conn.query("UPDATE voter SET voter_email = CONCAT(voter_email, ', ', ?) WHERE voter_vote_datetime is null and election_id = ? and voter_id = ?;", [email, electionId, voterId])

            conn.commit()
        } catch (e) {
            conn.rollback()
            throw e
        } finally {
            conn.release()
        }
    }

}