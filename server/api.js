import { Router } from "express";
import db from "./db.js";
const router = Router();

// router.get("/videos", async (_, res) => {
// 	try {
// 		const result = await db.query("SELECT * FROM videos");
// 		res.json(result.rows);
// 	} catch (error) {
// 		console.error("Error happened while getting videos: " + error);
// 		res
// 			.status(500)
// 			.json({ success: false, error: "Could not connect to the database" });
// 	}
// });

router.post("/videos", async (req, res) => {
	try {
		const { title, src } = req.body;
		if (title && src) {
			const newVideo = await db.query(
				"INSERT INTO videos (title, src) VALUES ($1, $2) RETURNING *",
				[title, src]
			);
			const insertedVideo = newVideo.rows[0];

			res.status(200).json(insertedVideo);
		} else {
			res
				.status(400)
				.json({ error: "bad request! video title or src is not valid" });
		}
	} catch (error) {
		console.error("Error during insertion into DB:", error.message);
		res.status(500).send("Error during insertion: " + error.message);
	}
});

router.delete("/videos/:id", async (req, res) => {
	const idOfVideo = Number(req.params.id);
	try {
		const deletedVideo = await db.query("DELETE FROM videos WHERE id=$1", [
			idOfVideo,
		]);
		if (deletedVideo.rowCount === 0) {
			res.status(404).json({ success: false, status: "Video not found" });
		} else {
			res.status(200).json();
		}
	} catch (error) {
		console.error("This is the error happened: " + error);
		res.status(500).json({ success: false, error: "Internal server error" });
	}
});

router.put("/videos/:id", async (req, res) => {
	const videoId = req.params.id;
	const voteChange = req.body.vote;

	// Validate input
	if (!videoId || (voteChange !== 1 && voteChange !== -1)) {
		return res.status(400).json({ message: "Invalid request parameters" });
	}

	try {
		const selectSql = `SELECT votes FROM videos WHERE id = $1`;
		const selectResult = await db.query(selectSql, [videoId]);

		if (selectResult.rows.length === 0) {
			return res.status(404).json({ message: "Video not found" });
		}

		const currentVotes = selectResult.rows[0].votes;

		// Calculate the new vote, ensuring it does not go below zero
		const newVotes = Math.max(0, currentVotes + voteChange);

		// Update the vote in the database
		const updateSql = `UPDATE videos SET votes = $1 WHERE id = $2 RETURNING *`;
		const updateResult = await db.query(updateSql, [newVotes, videoId]);

		// Return the updated row
		res.status(200).json(updateResult.rows[0]);
	} catch (error) {
		console.error("Error updating video votes:", error);

		if (error.code === "23514") {
			// '23514' is the PostgreSQL error code for a check constraint violation
			return res.status(400).json({ message: "Votes cannot be negative" });
		}

		res.status(500).json({ message: "Internal server error" });
	}
});

router.get("/videos", async (req, res) => {
	const order = req.query.order;

	try {
		if (order === "asc") {
			const result = await db.query("SELECT * FROM videos ORDER BY votes ASC");
			res.status(200).json(result.rows);
		} else if (order === "desc") {
			const result = await db.query("SELECT * FROM videos ORDER BY votes DESC");
			res.status(200).json(result.rows);
		} else {
			const result = await db.query("SELECT * FROM videos");

			res.status(200).json(result.rows);
		}
	} catch (error) {
		console.error("Error: ", error);
		res.status(500).json({ error: "Internal server error" });
	}
});

export default router;
