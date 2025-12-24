import React, { useEffect, useState } from "react";

function Dashboard() {
  const [votes, setVotes] = useState([]);

  useEffect(() => {
    fetch("http://localhost:3001/api/votes")
      .then(res => res.json())
      .then(data => setVotes(data))
      .catch(err => console.error(err));
  }, []);

  return (
    <div>
      <h1>คะแนนเลือกตั้ง</h1>
      <ul>
        {votes.map(v => (
          <li key={v.candidate}>
            {v.candidate}: {v.votes} คะแนน
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Dashboard;
