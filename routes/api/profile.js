const express = require("express");
const auth = require("../../middleware/auth");
const { check, validationResult } = require("express-validator");
const Profile = require("../../models/Profile");
const User = require("../../models/User");
const request = require("request");
const config = require("config");
const router = express.Router();

const updateProfileHandler = [
  check("status", "Status is required")
    .not()
    .isEmpty(),
  check("skills", "Skills is required")
    .not()
    .isEmpty()
];
const experienceHandler = [
  check("title", "Title is required")
    .not()
    .isEmpty(),
  check("company", "Company is required")
    .not()
    .isEmpty(),
  check("from", "From date is required")
    .not()
    .isEmpty()
];
const educationHandler = [
  check("school", "School is required")
    .not()
    .isEmpty(),
  check("degree", "Degree is required")
    .not()
    .isEmpty(),
  check("fieldofstudy", "Field of Study is required")
    .not()
    .isEmpty(),
  check("from", "From date is required")
    .not()
    .isEmpty()
];

// @route    GET api/profile/me
// @desc     Get current user's profile
// @access   Private
router.get("/me", auth, async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.user.id }).populate(
      "user",
      ["name", "avatar"]
    );

    if (!profile)
      return res.status(400).json({ msg: "There is no profile for this user" });

    res.json(profile);
  } catch (err) {
    console.log(err.message);
    res.status(500).send("Server error");
  }
});

// @route    POST api/profile
// @desc     Create or update user profile
// @access   Private
router.post("/", [auth, updateProfileHandler], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });

  const {
    company,
    website,
    location,
    status,
    skills,
    bio,
    githubusername,
    social
  } = req.body;

  const profileFields = {};
  profileFields.user = req.user.id;

  // Build Profile Object
  if (company) profileFields.company = company;
  if (website) profileFields.website = website;
  if (location) profileFields.location = location;
  if (bio) profileFields.bio = bio;
  if (status) profileFields.status = status;
  if (githubusername) profileFields.githubusername = githubusername;
  if (skills)
    profileFields.skills = skills.split(",").map(skill => skill.trim());
  console.log(profileFields.skills);

  // Build Social Object
  profileFields.social = {};
  if (social) {
    if (social.youtube) profileFields.social.youtube = social.youtube;
    if (social.twitter) profileFields.social.twitter = social.twitter;
    if (social.facebook) profileFields.social.facebook = social.facebook;
    if (social.linkedin) profileFields.social.linkedin = social.linkedin;
    if (social.instagram) profileFields.social.instagram = social.instagram;
  }
  // Attempt to Update/Create Profile
  try {
    let profile = await Profile.findOne({ user: req.user.id });

    if (profile) {
      // Update
      profile = await Profile.findOneAndUpdate(
        { user: req.user.id },
        { $set: profileFields },
        { new: true }
      );
    } else {
      // Create
      profile = new Profile(profileFields);

      await profile.save();
    }

    return res.json(profile);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// @route    GET api/profile
// @desc     Get all profiles
// @access   Public
router.get("/", async (req, res) => {
  try {
    const profiles = await Profile.find().populate("user", ["name", "avatar"]);

    return res.json(profiles);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// @route    GET api/profile/user/:user_id
// @desc     Get profile by user id
// @access   Public
router.get("/user/:user_id", async (req, res) => {
  try {
    const profile = await Profile.findOne({
      user: req.params.user_id
    }).populate("user", ["name", "avatar"]);

    if (!profile) return res.status(400).json({ msg: "Profile not found" });

    return res.json(profile);
  } catch (err) {
    console.error(err.message);

    // If user_id submitted doesn't match what mongoose expects for an id, it'll error.
    // Return no profile found as well.
    if (err.kind === "ObjectId")
      return res.status(400).json({ msg: "Profile not found" });

    return res.status(500).send("Server error");
  }
});

// @route    DELETE api/profile
// @desc     Delete profile, user, and posts.
// @access   Private
router.delete("/", auth, async (req, res) => {
  try {
    // TODO Remove users posts.

    await Profile.findOneAndRemove({ user: req.user.id });
    await User.findOneAndRemove({ _id: req.user.id });

    return res.json({ msg: "User deleted" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// @route    PUT api/profile/experience
// @desc     Add profile experience
// @access   Private
router.put("/experience", [auth, experienceHandler], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });

  const { title, company, location, from, to, current, description } = req.body;

  const newExperience = {
    title,
    company,
    location,
    from,
    to,
    current,
    description
  };

  try {
    const profile = await Profile.findOne({ user: req.user.id });

    profile.experience.unshift(newExperience);

    await profile.save();

    res.json(profile);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// @route    DELETE api/profile/experience/:exp_id
// @desc     Delete experience from profile
// @access   Private
router.delete("/experience/:exp_id", auth, async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.user.id });
    const removeIndex = profile.experience
      .map(item => item.id)
      .indexOf(req.params.exp_id);

    profile.experience.splice(removeIndex, 1);

    await profile.save();

    res.json(profile);
  } catch (err) {
    console.log(err.message);
    res.status(500).send("Server error");
  }
});

// @route    PUT api/profile/education
// @desc     Add profile education
// @access   Private
router.put("/education", [auth, educationHandler], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });

  const {
    school,
    degree,
    fieldofstudy,
    from,
    to,
    current,
    description
  } = req.body;

  const newEducation = {
    school,
    degree,
    fieldofstudy,
    from,
    to,
    current,
    description
  };

  try {
    const profile = await Profile.findOne({ user: req.user.id });

    profile.education.unshift(newEducation);

    await profile.save();

    res.json(profile);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// @route    DELETE api/profile/experience/:edu_id
// @desc     Delete education from profile
// @access   Private
router.delete("/education/:edu_id", auth, async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.user.id });
    const removeIndex = profile.education
      .map(item => item.id)
      .indexOf(req.params.edu_id);

    profile.education.splice(removeIndex, 1);

    await profile.save();

    res.json(profile);
  } catch (err) {
    console.log(err.message);
    res.status(500).send("Server error");
  }
});

// @route    GET api/profile/github/:username
// @desc     Get user repos from GitHub
// @access   Public
router.get("/github/:username", (req, res) => {
  try {
    const options = {
      uri: `https://api.github.com/users/${
        req.params.username
      }/repos?per_page=5&sort=created:asc&client_id=${config.get(
        "githubClientId"
      )}&client_secret=${config.get("githubClientSecret")}
      `,
      method: "GET",
      headers: { "user-agent": "node.js" }
    };

    request(options, (error, response, body) => {
      if (error) console.error(error);

      if (response.statusCode !== 200) {
        return res.status(404).json({ msg: "No Github profile found" });
      }

      res.json(JSON.parse(body));
    });
  } catch (err) {
    console.log(err.message);
    res.status(500).send("Server error");
  }
});

module.exports = router;
