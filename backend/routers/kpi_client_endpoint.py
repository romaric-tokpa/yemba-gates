# Endpoint KPI Client - À ajouter à la fin de backend/routers/kpi.py

@router.get("/client", response_model=ClientKPIs)
def get_client_kpis(
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    job_id: Optional[UUID] = Query(None),
    current_user: User = Depends(require_client),
    session: Session = Depends(get_session)
):
    """
    Récupère tous les KPI Client
    
    Accès réservé aux Clients et Administrateurs
    Les KPIs sont calculés uniquement pour les besoins créés par le client
    """
    filters = KPIFilters(
        start_date=start_date,
        end_date=end_date,
        job_id=job_id,
        recruiter_id=None,
        source=None
    )
    
    # Nombre total de besoins créés par le client
    jobs_query = select(func.count(Job.id)).where(Job.created_by == current_user.id)
    if filters.start_date:
        jobs_query = jobs_query.where(Job.created_at >= filters.start_date)
    if filters.end_date:
        jobs_query = jobs_query.where(Job.created_at <= filters.end_date)
    if filters.job_id:
        jobs_query = jobs_query.where(Job.id == filters.job_id)
    total_jobs_created = session.exec(jobs_query).one()
    
    # Statistiques par statut de besoin
    statuses = ['brouillon', 'a_valider', 'urgent', 'tres_urgent', 'besoin_courant', 'validé', 'en_cours', 'gagne', 'standby', 'archive', 'clôturé']
    client_jobs_by_status = []
    for status in statuses:
        status_query = select(func.count(Job.id)).where(
            Job.status == status,
            Job.created_by == current_user.id
        )
        if filters.start_date:
            status_query = status_query.where(Job.created_at >= filters.start_date)
        if filters.end_date:
            status_query = status_query.where(Job.created_at <= filters.end_date)
        if filters.job_id:
            status_query = status_query.where(Job.id == filters.job_id)
        
        count = session.exec(status_query).one()
        percentage = (count / total_jobs_created * 100) if total_jobs_created > 0 else 0
        
        client_jobs_by_status.append(JobStatusStatistics(
            status=status,
            count=count,
            percentage=round(percentage, 2)
        ))
    
    # Candidats en shortlist pour les besoins du client
    shortlist_query = select(func.count(Application.id)).join(
        Job, Application.job_id == Job.id
    ).where(
        Job.created_by == current_user.id,
        Application.is_in_shortlist == True
    )
    if filters.start_date:
        shortlist_query = shortlist_query.where(Application.created_at >= filters.start_date)
    if filters.end_date:
        shortlist_query = shortlist_query.where(Application.created_at <= filters.end_date)
    if filters.job_id:
        shortlist_query = shortlist_query.where(Application.job_id == filters.job_id)
    total_candidates_in_shortlist = session.exec(shortlist_query).one()
    
    # Candidats validés
    validated_query = select(func.count(Application.id)).join(
        Job, Application.job_id == Job.id
    ).where(
        Job.created_by == current_user.id,
        Application.is_in_shortlist == True,
        Application.client_validated == True
    )
    if filters.start_date:
        validated_query = validated_query.where(Application.created_at >= filters.start_date)
    if filters.end_date:
        validated_query = validated_query.where(Application.created_at <= filters.end_date)
    if filters.job_id:
        validated_query = validated_query.where(Application.job_id == filters.job_id)
    total_candidates_validated = session.exec(validated_query).one()
    
    # Candidats rejetés
    rejected_query = select(func.count(Application.id)).join(
        Job, Application.job_id == Job.id
    ).where(
        Job.created_by == current_user.id,
        Application.is_in_shortlist == True,
        Application.client_validated == False,
        Application.client_validated_at.isnot(None)
    )
    if filters.start_date:
        rejected_query = rejected_query.where(Application.created_at >= filters.start_date)
    if filters.end_date:
        rejected_query = rejected_query.where(Application.created_at <= filters.end_date)
    if filters.job_id:
        rejected_query = rejected_query.where(Application.job_id == filters.job_id)
    total_candidates_rejected = session.exec(rejected_query).one()
    
    # Taux de validation
    validation_rate = (total_candidates_validated / total_candidates_in_shortlist * 100) if total_candidates_in_shortlist > 0 else None
    
    # Entretiens planifiés pour les besoins du client
    interviews_query = select(func.count(Interview.id)).join(
        Application, Interview.application_id == Application.id
    ).join(
        Job, Application.job_id == Job.id
    ).where(
        Job.created_by == current_user.id
    )
    if filters.start_date:
        interviews_query = interviews_query.where(Interview.created_at >= filters.start_date)
    if filters.end_date:
        interviews_query = interviews_query.where(Interview.created_at <= filters.end_date)
    if filters.job_id:
        interviews_query = interviews_query.join(Application).where(Application.job_id == filters.job_id)
    total_interviews_scheduled = session.exec(interviews_query).one()
    
    # Temps moyen de recrutement (Time to Hire)
    time_to_hire_query = select(
        func.avg(
            func.extract('epoch', Application.updated_at - Job.created_at) / 86400
        )
    ).select_from(Application).join(Job, Application.job_id == Job.id).where(
        Job.created_by == current_user.id,
        Application.status == "embauché",
        Application.updated_at.isnot(None),
        Job.created_at.isnot(None)
    )
    if filters.start_date:
        time_to_hire_query = time_to_hire_query.where(Job.created_at >= filters.start_date)
    if filters.end_date:
        time_to_hire_query = time_to_hire_query.where(Job.created_at <= filters.end_date)
    if filters.job_id:
        time_to_hire_query = time_to_hire_query.where(Job.id == filters.job_id)
    avg_time_to_hire = session.exec(time_to_hire_query).one()
    average_time_to_hire = float(avg_time_to_hire) if avg_time_to_hire else None
    
    # Temps moyen de pourvoir un poste (Time to Fill)
    time_to_fill_query = select(
        func.avg(
            func.extract('epoch', Application.updated_at - Job.validated_at) / 86400
        )
    ).select_from(Application).join(Job, Application.job_id == Job.id).where(
        Job.created_by == current_user.id,
        Application.status == "offre",
        Application.updated_at.isnot(None),
        Job.validated_at.isnot(None)
    )
    if filters.start_date:
        time_to_fill_query = time_to_fill_query.where(Job.created_at >= filters.start_date)
    if filters.end_date:
        time_to_fill_query = time_to_fill_query.where(Job.created_at <= filters.end_date)
    if filters.job_id:
        time_to_fill_query = time_to_fill_query.where(Job.id == filters.job_id)
    avg_time_to_fill = session.exec(time_to_fill_query).one()
    average_time_to_fill = float(avg_time_to_fill) if avg_time_to_fill else None
    
    # % de postes respectant le délai
    TARGET_DAYS = 60
    closed_jobs_query = select(Job).where(
        Job.created_by == current_user.id,
        Job.status == "clôturé",
        Job.closed_at.isnot(None),
        Job.validated_at.isnot(None)
    )
    if filters.start_date:
        closed_jobs_query = closed_jobs_query.where(Job.created_at >= filters.start_date)
    if filters.end_date:
        closed_jobs_query = closed_jobs_query.where(Job.created_at <= filters.end_date)
    if filters.job_id:
        closed_jobs_query = closed_jobs_query.where(Job.id == filters.job_id)
    closed_jobs = session.exec(closed_jobs_query).all()
    
    on_time_count = 0
    for job in closed_jobs:
        if job.closed_at and job.validated_at:
            duration = (job.closed_at - job.validated_at).total_seconds() / 86400
            if duration <= TARGET_DAYS:
                on_time_count += 1
    
    jobs_on_time_rate = (on_time_count / len(closed_jobs) * 100) if closed_jobs else None
    
    # Statistiques de sourcing pour les besoins du client
    sourcing_stats = None
    from datetime import datetime, timedelta
    now = datetime.utcnow()
    today_start = datetime(now.year, now.month, now.day)
    month_start = datetime(now.year, now.month, 1)
    year_start = datetime(now.year, 1, 1)
    
    # Récupérer les IDs des jobs du client
    client_jobs_ids_query = select(Job.id).where(Job.created_by == current_user.id)
    if filters.job_id:
        client_jobs_ids_query = client_jobs_ids_query.where(Job.id == filters.job_id)
    client_job_ids = session.exec(client_jobs_ids_query).all()
    
    if client_job_ids:
        # Candidats sourcés via les applications des jobs du client
        today_count_query = select(func.count(Application.id)).join(
            Candidate, Application.candidate_id == Candidate.id
        ).where(
            Application.job_id.in_(client_job_ids),
            Candidate.status == "sourcé",
            Candidate.created_at >= today_start
        )
        if filters.start_date:
            today_count_query = today_count_query.where(Candidate.created_at >= filters.start_date)
        if filters.end_date:
            today_count_query = today_count_query.where(Candidate.created_at <= filters.end_date)
        today_count = session.exec(today_count_query).one()
        
        this_month_count_query = select(func.count(Application.id)).join(
            Candidate, Application.candidate_id == Candidate.id
        ).where(
            Application.job_id.in_(client_job_ids),
            Candidate.status == "sourcé",
            Candidate.created_at >= month_start
        )
        if filters.start_date:
            this_month_count_query = this_month_count_query.where(Candidate.created_at >= filters.start_date)
        if filters.end_date:
            this_month_count_query = this_month_count_query.where(Candidate.created_at <= filters.end_date)
        this_month_count = session.exec(this_month_count_query).one()
        
        this_year_count_query = select(func.count(Application.id)).join(
            Candidate, Application.candidate_id == Candidate.id
        ).where(
            Application.job_id.in_(client_job_ids),
            Candidate.status == "sourcé",
            Candidate.created_at >= year_start
        )
        if filters.start_date:
            this_year_count_query = this_year_count_query.where(Candidate.created_at >= filters.start_date)
        if filters.end_date:
            this_year_count_query = this_year_count_query.where(Candidate.created_at <= filters.end_date)
        this_year_count = session.exec(this_year_count_query).one()
        
        # Total candidats sourcés
        all_candidates_query = select(func.count(Application.id)).join(
            Candidate, Application.candidate_id == Candidate.id
        ).where(
            Application.job_id.in_(client_job_ids),
            Candidate.status == "sourcé"
        )
        if filters.start_date:
            all_candidates_query = all_candidates_query.where(Candidate.created_at >= filters.start_date)
        if filters.end_date:
            all_candidates_query = all_candidates_query.where(Candidate.created_at <= filters.end_date)
        total_candidates = session.exec(all_candidates_query).one()
        
        # Calculer les moyennes
        if filters.start_date:
            start_date = filters.start_date
        else:
            first_candidate_query = select(func.min(Candidate.created_at)).join(
                Application, Candidate.id == Application.candidate_id
            ).where(
                Application.job_id.in_(client_job_ids),
                Candidate.status == "sourcé"
            )
            first_candidate_date = session.exec(first_candidate_query).one()
            start_date = first_candidate_date if first_candidate_date else now - timedelta(days=30)
        
        end_date = filters.end_date if filters.end_date else now
        days_diff = (end_date - start_date).days
        if days_diff <= 0:
            days_diff = 1
        
        per_day = total_candidates / days_diff if days_diff > 0 else 0
        per_month = per_day * 30
        per_year = per_day * 365
        
        sourcing_stats = SourcingStatistics(
            per_day=round(per_day, 2),
            per_month=round(per_month, 2),
            per_year=round(per_year, 2),
            today_count=today_count,
            this_month_count=this_month_count,
            this_year_count=this_year_count
        )
    
    return ClientKPIs(
        total_jobs_created=total_jobs_created,
        jobs_by_status=client_jobs_by_status,
        total_candidates_in_shortlist=total_candidates_in_shortlist,
        total_candidates_validated=total_candidates_validated,
        total_candidates_rejected=total_candidates_rejected,
        validation_rate=validation_rate,
        total_interviews_scheduled=total_interviews_scheduled,
        average_time_to_hire=average_time_to_hire,
        average_time_to_fill=average_time_to_fill,
        jobs_on_time_rate=jobs_on_time_rate,
        sourcing_statistics=sourcing_stats
    )

