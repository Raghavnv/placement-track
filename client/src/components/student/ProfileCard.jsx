import { GraduationCap, MapPin, Target } from 'lucide-react';
import { UserAvatar } from '../common/Avatar';
import { interestOption, roleLabel } from '../../utils/profileOptions';
import { jobTypeLabel } from '../../utils/constants';

// "Student ID" style card that fills in as the student answers onboarding questions.
export default function ProfileCard({ user, draft = {}, tilt = false }) {
  const profile = { ...user, ...draft };
  const skills = profile.skills || [];
  const interests = profile.interests || [];
  const roles = profile.preferredRoles || [];
  const locations = profile.preferredLocations || [];
  const jobTypes = profile.jobTypes || [];

  return (
    <article className={`profile-id ${tilt ? 'profile-id--tilt' : ''}`} aria-label="Your profile card">
      <header className="profile-id__head">
        <UserAvatar name={profile.name} size="lg" />
        <div>
          <p className="profile-id__name">{profile.name}</p>
          <p className="profile-id__college">
            <GraduationCap size={14} aria-hidden="true" />
            {profile.college || 'Your college'}
          </p>
        </div>
        <span className="profile-id__badge">{profile.branch || '—'}</span>
      </header>

      <dl className="profile-id__stats">
        <div>
          <dt>CGPA</dt>
          <dd>{profile.cgpa ?? '—'}</dd>
        </div>
        <div>
          <dt>Batch</dt>
          <dd>{profile.graduationYear ?? '—'}</dd>
        </div>
        <div>
          <dt>Backlogs</dt>
          <dd>{profile.backlogs ?? 0}</dd>
        </div>
      </dl>

      <section className="profile-id__section">
        <h3>Skills</h3>
        {skills.length ? (
          <ul className="mini-chips">
            {skills.slice(0, 10).map((s) => (
              <li key={s}>{s}</li>
            ))}
            {skills.length > 10 && <li className="mini-chips__more">+{skills.length - 10}</li>}
          </ul>
        ) : (
          <p className="profile-id__empty">Waiting for your skills…</p>
        )}
      </section>

      <section className="profile-id__section">
        <h3>Into</h3>
        {interests.length ? (
          <ul className="mini-chips mini-chips--soft">
            {interests.map((key) => {
              const option = interestOption(key);
              return (
                <li key={key}>
                  <span aria-hidden="true">{option?.emoji}</span> {option?.label || key}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="profile-id__empty">What excites you?</p>
        )}
      </section>

      <section className="profile-id__section">
        <h3>
          <Target size={13} aria-hidden="true" /> Looking for
        </h3>
        {roles.length ? (
          <p className="profile-id__roles">{roles.map(roleLabel).join(' · ')}</p>
        ) : (
          <p className="profile-id__empty">Dream roles go here</p>
        )}
        {(locations.length > 0 || jobTypes.length > 0 || profile.expectedPackage > 0) && (
          <p className="profile-id__prefs">
            {locations.length > 0 && (
              <span>
                <MapPin size={13} aria-hidden="true" /> {locations.slice(0, 3).join(', ')}
                {locations.length > 3 ? ` +${locations.length - 3}` : ''}
              </span>
            )}
            {jobTypes.length > 0 && <span>{jobTypes.map(jobTypeLabel).join(' / ')}</span>}
            {profile.expectedPackage ? <span>₹{profile.expectedPackage}+ LPA</span> : null}
          </p>
        )}
      </section>

      <footer className="profile-id__foot" aria-hidden="true">
        <span>PLACEMENTTRACK · STUDENT</span>
        <span>{profile.rollNumber}</span>
      </footer>
    </article>
  );
}
